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

    const [rows] = await getPool().query(
      `SELECT id, product_id AS productId, slug, title, time_limit_minutes AS timeLimitMinutes,
              pass_threshold AS passThreshold,
              (SELECT COUNT(*) FROM questions WHERE questions.exam_id = exams.id) AS questionCount,
              status
       FROM exams
       WHERE product_id = ?
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
      `SELECT id, product_id AS productId, slug, title, time_limit_minutes AS timeLimitMinutes,
              pass_threshold AS passThreshold,
              (SELECT COUNT(*) FROM questions WHERE questions.exam_id = exams.id) AS questionCount,
              status
       FROM exams
       ORDER BY id ASC`
    );

    response.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/exams/:slug", async (request, response, next) => {
  try {
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
