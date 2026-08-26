import { Router } from "express";
import { getPool } from "../db.js";
import { sampleExams, sampleProducts } from "../fixtures.js";
import { getDatabaseReady, getExamBySlug, getProductBySlug, normalizeProduct } from "../helpers.js";
import type { ProductSummaryRow } from "../types.js";

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

export default router;
