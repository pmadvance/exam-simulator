import { Router } from "express";
import { z } from "zod";
import { getPool } from "../db.js";
import { sampleExams, sampleProducts, sampleQuestions } from "../fixtures.js";
import { getDatabaseReady, getExamBySlug, getProductBySlug, normalizeProduct } from "../helpers.js";
import type { ProductSummaryRow } from "../types.js";
import { answersMatch } from "../scoring.js";
import { isRateLimited } from "../middleware/rate-limit.js";

const router = Router();

router.get("/products", async (_request, response, next) => {
  try {
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json(sampleProducts);
      return;
    }

    const [rows] = await getPool().query(
      `SELECT id, slug, title, description, category, difficulty, price_usd AS priceUsd, access_days AS accessDays
       FROM products
       WHERE visibility = 'published'
       ORDER BY id DESC`
    );

    response.json((rows as ProductSummaryRow[]).map(normalizeProduct));
  } catch (error) {
    next(error);
  }
});

router.get("/products/:slug", async (request, response, next) => {
  try {
    const product = await getProductBySlug(request.params.slug);
    if (!product) {
      response.status(404).json({ message: "Product not found" });
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      const exams = sampleExams.filter((exam) => exam.productId === product.id);
      response.json({ ...product, exams });
      return;
    }

    const [visibilityRows] = await getPool().query(
      `SELECT id FROM products WHERE id = ? AND visibility = 'published' LIMIT 1`,
      [product.id]
    );
    if ((visibilityRows as Array<{ id: number }>).length === 0) {
      response.status(404).json({ message: "Product not found" });
      return;
    }

    const [rows] = await getPool().query(
      `SELECT id, product_id AS productId, slug, title, time_limit_minutes AS timeLimitMinutes,
              pass_threshold AS passThreshold,
              exam_type AS examType,
              (SELECT COUNT(*) FROM questions WHERE questions.exam_id = exams.id AND questions.status = 'published') AS questionCount,
              status
       FROM exams
       WHERE product_id = ? AND status = 'published'
       ORDER BY id ASC`,
      [product.id]
    );

    response.json({ ...product, exams: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/exams", async (_request, response, next) => {
  try {
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json(sampleExams);
      return;
    }

    const [rows] = await getPool().query(
      `SELECT exams.id, exams.product_id AS productId, exams.slug, exams.title,
              exams.time_limit_minutes AS timeLimitMinutes,
              exams.pass_threshold AS passThreshold,
              exams.exam_type AS examType,
              (SELECT COUNT(*) FROM questions WHERE questions.exam_id = exams.id AND questions.status = 'published') AS questionCount,
              exams.status
       FROM exams
       INNER JOIN products ON products.id = exams.product_id
       WHERE exams.status = 'published' AND products.visibility = 'published'
       ORDER BY exams.id ASC`
    );

    response.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/exams/:slug", async (request, response, next) => {
  try {
    const databaseReady = await getDatabaseReady();
    if (databaseReady) {
      const [publishedRows] = await getPool().query(
        `SELECT exams.id
         FROM exams
         INNER JOIN products ON products.id = exams.product_id
         WHERE exams.slug = ? AND exams.status = 'published' AND products.visibility = 'published'
         LIMIT 1`,
        [request.params.slug]
      );
      if ((publishedRows as Array<{ id: number }>).length === 0) {
        response.status(404).json({ message: "Exam not found" });
        return;
      }
    }

    const exam = await getExamBySlug(request.params.slug);
    if (!exam) {
      response.status(404).json({ message: "Exam not found" });
      return;
    }

    response.json(exam);
  } catch (error) {
    next(error);
  }
});

const previewGradeSchema = z.object({
  answers: z.record(z.string(), z.string().max(10)).refine((answers) => Object.keys(answers).length <= 5, "A maximum of five preview answers is allowed")
});

router.post("/exams/:slug/preview/grade", async (request, response, next) => {
  try {
    if (await isRateLimited(request.ip ?? "unknown", "exam-preview-grade", 30, 60_000)) {
      response.status(429).json({ message: "Too many preview requests. Please try again shortly." });
      return;
    }
    const payload = previewGradeSchema.parse(request.body ?? {});
    const databaseReady = await getDatabaseReady();
    let previewRows: Array<{ id: number; correctAnswer: string; explanation: string }>;
    if (databaseReady) {
      const [rows] = await getPool().query(
        `SELECT q.id, q.correct_answer AS correctAnswer, q.explanation
         FROM questions q
         INNER JOIN exams e ON e.id = q.exam_id
         INNER JOIN products p ON p.id = e.product_id
         WHERE e.slug = ? AND e.status = 'published' AND p.visibility = 'published'
           AND q.status = 'published'
         ORDER BY CASE WHEN q.id = (
           SELECT MIN(preview_q.id) FROM questions preview_q
           WHERE preview_q.exam_id = e.id AND preview_q.status = 'published' AND preview_q.question_type = 'multiple_response'
         ) THEN 0 ELSE 1 END, q.id ASC
         LIMIT 5`,
        [request.params.slug]
      );
      previewRows = rows as Array<{ id: number; correctAnswer: string; explanation: string }>;
    } else {
      const exam = sampleExams.find((candidate) => candidate.slug === request.params.slug);
      previewRows = sampleQuestions.filter((question) => question.examId === exam?.id).slice(0, 5).map((question) => ({
        id: question.id, correctAnswer: question.correctAnswer, explanation: question.explanation,
      }));
    }
    if (previewRows.length === 0) {
      response.status(404).json({ message: "Preview not found" });
      return;
    }
    const results = previewRows
      .filter((row) => Object.prototype.hasOwnProperty.call(payload.answers, String(row.id)))
      .map((row) => ({
        questionId: row.id,
        correct: answersMatch(payload.answers[String(row.id)], row.correctAnswer),
        correctAnswer: row.correctAnswer,
        explanation: row.explanation,
      }));
    response.setHeader("Cache-Control", "no-store");
    response.json({
      score: results.filter((result) => result.correct).length,
      answered: results.length,
      totalQuestions: previewRows.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
