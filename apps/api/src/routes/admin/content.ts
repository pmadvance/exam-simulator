import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getPool } from "../../db.js";
import { getDatabaseReady, toIsoString, writeAuditLog, parseJsonField, encodeCsvCell, parseQuestionCsv, generateUniqueSlug } from "../../helpers.js";
import {
  sessionPolicyUpdateSchema, questionImportSchema, questionImportApplySchema,
  questionRollbackSchema, productCreateSchema, productUpdateSchema,
  questionCreateSchema, questionUpdateSchema, examCreateSchema, examUpdateSchema,
  voucherCreateSchema, categoryCreateSchema, domainCreateSchema, domainUpdateSchema
} from "../../schemas.js";
import { attempts } from "../../store.js";
import { UPLOADS_DIR } from "../../app.js";
import { env } from "../../config.js";
import { z } from "zod";
import crypto from "crypto";

// ── multer setup for image uploads ──
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(UPLOADS_DIR, "questions");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    // Preserve original filename, but sanitise and deduplicate
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);
    const dir = path.join(UPLOADS_DIR, "questions");
    let candidate = `${base}${ext}`;
    let counter = 1;
    while (fs.existsSync(path.join(dir, candidate))) {
      candidate = `${base}-${counter}${ext}`;
      counter++;
    }
    cb(null, candidate);
  },
});

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed."));
    }
  },
});

/**
 * Resolve an imageUrl value from CSV to a full path.
 * Accepts: bare filename ("risk-matrix.png"), full path ("/uploads/questions/x.png"), or URL.
 * Returns the resolved path if the file exists on disk, otherwise returns the original value.
 */
function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already a full path — keep as-is
  if (trimmed.startsWith("/uploads/questions/")) return trimmed;

  // External URL — keep as-is
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Treat as a filename — check if it exists in uploads
  const basename = path.basename(trimmed); // strip any directory parts
  const filePath = path.join(UPLOADS_DIR, "questions", basename);
  if (fs.existsSync(filePath)) {
    return `/uploads/questions/${basename}`;
  }

  // Not found — return as-is so it still shows up (user may upload later)
  return trimmed;
}

const router = Router();

// ───────────── Admin Product CRUD ─────────────

router.get("/products", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query(
      `SELECT id, slug, title, description, category, difficulty, price_usd AS priceUsd, access_days AS accessDays, visibility
       FROM products
       ORDER BY id DESC`
    );
    response.json(rows);
  } catch (error) { next(error); }
});

router.post("/products", async (request, response, next) => {
  try {
    const payload = productCreateSchema.parse(request.body);
    const slug = payload.slug || await generateUniqueSlug(payload.title, "products");
    const [result] = await getPool().execute(
      `INSERT INTO products (slug, title, description, category, difficulty, price_usd, access_days, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, payload.title, payload.description, payload.category, payload.difficulty, payload.priceUsd, payload.accessDays, payload.visibility]
    );
    const productId = (result as { insertId: number }).insertId;
    await writeAuditLog(response.locals.user.userId, "admin.product.created", "product", String(productId), { ...payload, slug });
    response.status(201).json({ id: productId, ...payload, slug });
  } catch (error) { next(error); }
});

router.patch("/products/:id", async (request, response, next) => {
  try {
    const payload = productUpdateSchema.parse(request.body);
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      const col = key === "priceUsd" ? "price_usd" : key === "accessDays" ? "access_days" : key;
      sets.push(`${col} = ?`);
      vals.push(value as string | number | null);
    }
    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }
    vals.push(Number(request.params.id));
    const [result] = await getPool().execute(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, vals);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Product not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.product.updated", "product", request.params.id, payload);
    response.json({ id: Number(request.params.id), ...payload });
  } catch (error) { next(error); }
});

router.patch("/products/:id/status", async (request, response, next) => {
  try {
    const { visibility } = z.object({ visibility: z.enum(["draft", "published", "archived"]) }).parse(request.body);
    const [result] = await getPool().execute(`UPDATE products SET visibility = ? WHERE id = ?`, [visibility, request.params.id]);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Product not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.product.status", "product", request.params.id, { visibility });
    response.json({ id: Number(request.params.id), visibility });
  } catch (error) { next(error); }
});

// ───────────── Admin Exam Preview (all questions) ─────────────

router.get("/exams", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query(
      `SELECT exams.id, exams.product_id AS productId, exams.slug, exams.title,
              exams.time_limit_minutes AS timeLimitMinutes,
              exams.pass_threshold AS passThreshold,
              (SELECT COUNT(*) FROM questions WHERE questions.exam_id = exams.id) AS questionCount,
              exams.status
       FROM exams
       ORDER BY exams.id DESC`
    );
    response.json(rows);
  } catch (error) { next(error); }
});

router.get("/exams/:id/preview-questions", async (request, response, next) => {
  try {
    const examId = Number(request.params.id);
    const [rows] = await getPool().query(
      `SELECT id, prompt, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD,
              option_e AS optionE, correct_answer AS correctAnswer, explanation, question_type AS questionType, image_url AS imageUrl
       FROM questions WHERE exam_id = ? AND status = 'published' ORDER BY id`,
      [examId]
    );
    response.json(rows);
  } catch (error) { next(error); }
});

// ───────────── Admin Question CRUD ─────────────

router.get("/questions", async (request, response, next) => {
  try {
    const examId = request.query.examId ? Number(request.query.examId) : null;
    const limit = Math.min(Math.max(Number(request.query.limit ?? 100), 1), 500);
    const offset = Math.max(Number(request.query.offset ?? 0), 0);
    let query = `SELECT questions.id, questions.exam_id AS examId, exams.slug AS examSlug,
                        questions.question_type AS questionType,
                        questions.prompt, questions.option_a AS optionA, questions.option_b AS optionB,
                        questions.option_c AS optionC, questions.option_d AS optionD, questions.option_e AS optionE,
                        questions.correct_answer AS correctAnswer, questions.explanation,
                        questions.eco_domain AS ecoDomain, questions.performance_domain AS performanceDomain, questions.image_url AS imageUrl,
                        questions.difficulty, questions.status, questions.created_at AS createdAt, questions.updated_at AS updatedAt
                 FROM questions INNER JOIN exams ON exams.id = questions.exam_id`;
    const params: unknown[] = [];
    if (examId) { query += ` WHERE questions.exam_id = ?`; params.push(examId); }
    query += ` ORDER BY questions.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const [rows] = await getPool().query(query, params);
    response.json(rows);
  } catch (error) { next(error); }
});

router.post("/questions", async (request, response, next) => {
  try {
    const payload = questionCreateSchema.parse(request.body);
    const [result] = await getPool().execute(
      `INSERT INTO questions (exam_id, question_type, prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, eco_domain, performance_domain, image_url, difficulty, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payload.examId, payload.questionType, payload.prompt, payload.optionA, payload.optionB, payload.optionC, payload.optionD, payload.optionE ?? "", payload.correctAnswer, payload.explanation, payload.ecoDomain ?? null, payload.performanceDomain ?? null, payload.imageUrl ?? null, payload.difficulty ?? null, payload.status]
    );
    const questionId = (result as { insertId: number }).insertId;
    const [examRows] = await getPool().query<RowDataPacket[]>(`SELECT slug FROM exams WHERE id = ? LIMIT 1`, [payload.examId]);
    const examSlug = examRows[0]?.slug ?? "";
    await writeAuditLog(response.locals.user.userId, "admin.question.created", "question", String(questionId), { examId: payload.examId });
    response.status(201).json({ id: questionId, ...payload, examSlug });
  } catch (error) { next(error); }
});

router.patch("/questions/:id", async (request, response, next) => {
  try {
    const payload = questionUpdateSchema.parse(request.body);
    const columnMap: Record<string, string> = { questionType: "question_type", optionA: "option_a", optionB: "option_b", optionC: "option_c", optionD: "option_d", optionE: "option_e", correctAnswer: "correct_answer", imageUrl: "image_url", ecoDomain: "eco_domain", performanceDomain: "performance_domain", difficulty: "difficulty" };
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      sets.push(`${columnMap[key] ?? key} = ?`);
      vals.push(value as string | number | null);
    }
    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }
    vals.push(Number(request.params.id));
    const [result] = await getPool().execute(`UPDATE questions SET ${sets.join(", ")} WHERE id = ?`, vals);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Question not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.question.updated", "question", request.params.id, payload);
    response.json({ id: Number(request.params.id), ...payload });
  } catch (error) { next(error); }
});

router.delete("/questions/:id", async (request, response, next) => {
  try {
    const [result] = await getPool().execute(`DELETE FROM questions WHERE id = ?`, [request.params.id]);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Question not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.question.deleted", "question", request.params.id, {});
    response.status(204).send();
  } catch (error) { next(error); }
});

// ───────────── Image Upload for Questions ─────────────

router.post("/questions/upload-image", upload.single("image"), (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({ message: "No image file provided." });
      return;
    }
    const imageUrl = `/uploads/questions/${request.file.filename}`;
    response.json({ imageUrl, filename: request.file.filename });
  } catch (error) { next(error); }
});

router.post("/assets/upload", upload.array("images", 50), (request, response, next) => {
  try {
    const files = request.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      response.status(400).json({ message: "No files provided." });
      return;
    }
    const uploaded = files.map((f) => ({
      filename: f.filename,
      url: `/uploads/questions/${f.filename}`,
      size: f.size,
    }));
    response.json({ uploaded, count: uploaded.length });
  } catch (error) { next(error); }
});

// ───────────── Assets Management ─────────────

router.get("/assets", async (request, response, next) => {
  try {
    const dir = path.join(UPLOADS_DIR, "questions");
    if (!fs.existsSync(dir)) { response.json([]); return; }
    const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));

    // Check which images are referenced in questions
    const databaseReady = await getDatabaseReady();
    let usedImages: Set<string> = new Set();
    if (databaseReady) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        "SELECT DISTINCT image_url FROM questions WHERE image_url IS NOT NULL AND image_url != ''"
      );
      for (const row of rows) {
        const url = row.image_url as string;
        const filename = url.split("/").pop();
        if (filename) usedImages.add(filename);
      }
    }

    const assets = files.map((filename) => {
      const stat = fs.statSync(path.join(dir, filename));
      return {
        filename,
        url: `/uploads/questions/${filename}`,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        inUse: usedImages.has(filename),
      };
    });
    assets.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    response.json(assets);
  } catch (error) { next(error); }
});

router.delete("/assets/:filename", async (request, response, next) => {
  try {
    const { filename } = request.params;
    // Sanitise filename to prevent path traversal
    if (/[/\\]/.test(filename) || filename.includes("..")) {
      response.status(400).json({ message: "Invalid filename." });
      return;
    }
    const filePath = path.join(UPLOADS_DIR, "questions", filename);
    if (!fs.existsSync(filePath)) {
      response.status(404).json({ message: "File not found." });
      return;
    }

    // Check if in use
    const databaseReady = await getDatabaseReady();
    if (databaseReady) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        "SELECT id FROM questions WHERE image_url LIKE ? LIMIT 1",
        [`%${filename}`]
      );
      if ((rows as RowDataPacket[]).length > 0) {
        response.status(409).json({ message: "Image is in use by a question. Remove the reference first." });
        return;
      }
    }

    fs.unlinkSync(filePath);
    await writeAuditLog(response.locals.user.userId, "admin.assets.delete", "file", filename, {});
    response.json({ message: "Deleted." });
  } catch (error) { next(error); }
});

// ───────────── Bulk CSV Upload for Questions ─────────────

router.post("/questions/upload-csv", async (request, response, next) => {
  try {
    const { examId, csv } = z.object({
      examId: z.coerce.number().int().positive(),
      csv: z.string().min(10),
    }).parse(request.body);

    console.log(`[CSV Import] Received ${csv.length} chars for exam ${examId}`);

    // Use the unified parser
    const parsed = parseQuestionCsv(csv);
    
    console.log(`[CSV Import] Parsed ${parsed.records.length} records, skipped ${parsed.skippedRows} rows`);
    if (parsed.skipReasons.length > 0) {
      console.log(`[CSV Import] Skip reasons:`, parsed.skipReasons);
    }
    
    if (parsed.records.length === 0) {
      response.status(400).json({ 
        message: "No valid data rows found in CSV.",
        skippedRows: parsed.skippedRows,
        skipReasons: parsed.skipReasons.slice(0, 20)
      });
      return;
    }

    // Bulk insert
    const pool = getPool();
    let inserted = 0;
    const insertErrors: string[] = [];
    
    for (let i = 0; i < parsed.records.length; i++) {
      const r = parsed.records[i];
      try {
        await pool.execute(
          `INSERT INTO questions (exam_id, question_type, prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, eco_domain, performance_domain, image_url, status, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [examId, r.questionType, r.prompt, r.optionA, r.optionB, r.optionC, r.optionD, r.optionE, r.correctAnswer, r.explanation, r.ecoDomain, r.performanceDomain, r.imageUrl, r.status, r.difficulty]
        );
        inserted++;
        if (i < 5 || i === parsed.records.length - 1) {
          console.log(`[CSV Import] Inserted row ${i + 1}/${parsed.records.length}: ${r.prompt.substring(0, 50)}...`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        insertErrors.push(`Row ${i + 1}: ${errorMsg}`);
        console.error(`[CSV Import] Error on row ${i + 1}: ${errorMsg}`);
        // Continue with next record
      }
    }
    
    console.log(`[CSV Import] Complete: ${inserted}/${parsed.records.length} inserted, ${insertErrors.length} errors`);

    await writeAuditLog(response.locals.user.userId, "admin.questions.csv-upload", "exam", String(examId), { inserted, attempted: parsed.records.length });
    response.json({ 
      inserted, 
      total: parsed.records.length, 
      skippedRows: parsed.skippedRows,
      skipReasons: parsed.skipReasons.slice(0, 10),
      insertErrors: insertErrors.slice(0, 10)
    });
  } catch (error) { next(error); }
});

// ───────────── XLSX Upload (parses Excel and reuses CSV pipeline) ─────────────

const xlsxStorage = multer.memoryStorage();
const xlsxUpload = multer({
  storage: xlsxStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    if (!ok) return cb(new Error("Only .xlsx/.xls files allowed"));
    cb(null, true);
  },
});

router.post("/questions/upload-xlsx", xlsxUpload.single("file"), async (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({ message: "No file uploaded" });
      return;
    }
    const examSlug = String(request.body?.examSlug ?? "").trim();
    if (!examSlug) {
      response.status(400).json({ message: "examSlug is required" });
      return;
    }

    // Lookup exam id
    const [examRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM exams WHERE slug = ? LIMIT 1`,
      [examSlug]
    );
    const examId = examRows[0]?.id as number | undefined;
    if (!examId) {
      response.status(404).json({ message: `Exam not found: ${examSlug}` });
      return;
    }

    // Parse XLSX → CSV string
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(request.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      response.status(400).json({ message: "Workbook contains no sheets" });
      return;
    }
    const sheet = workbook.Sheets[firstSheetName];
    const csvText = XLSX.utils.sheet_to_csv(sheet);

    // Reuse the unified parser
    const parsed = parseQuestionCsv(csvText);
    if (parsed.records.length === 0) {
      response.status(400).json({
        message: "No valid rows parsed from XLSX",
        skippedRows: parsed.skippedRows,
        skipReasons: parsed.skipReasons.slice(0, 10),
      });
      return;
    }

    const connection = await getPool().getConnection();
    let inserted = 0;
    try {
      await connection.beginTransaction();
      for (const r of parsed.records) {
        await connection.execute(
          `INSERT INTO questions (exam_id, question_type, prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, eco_domain, performance_domain, image_url, status, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [examId, r.questionType, r.prompt, r.optionA, r.optionB, r.optionC, r.optionD, r.optionE, r.correctAnswer, r.explanation, r.ecoDomain, r.performanceDomain, resolveImageUrl(r.imageUrl), r.status, r.difficulty]
        );
        inserted++;
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    await writeAuditLog(response.locals.user.userId, "admin.questions.xlsx-upload", "exam", examSlug, {
      sheet: firstSheetName,
      inserted,
      skippedRows: parsed.skippedRows,
    });
    response.json({
      inserted,
      total: parsed.records.length,
      skippedRows: parsed.skippedRows,
      skipReasons: parsed.skipReasons.slice(0, 20),
      sheet: firstSheetName,
    });
  } catch (error) { next(error); }
});

/** Simple CSV row parser handling quoted fields */
function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

// ───────────── Admin Exam Builder ─────────────

router.post("/exams", async (request, response, next) => {
  try {
    const payload = examCreateSchema.parse(request.body);
    const slug = payload.slug || await generateUniqueSlug(payload.title, "exams");
    const [result] = await getPool().execute(
      `INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [payload.productId, slug, payload.title, payload.timeLimitMinutes, payload.passThreshold, payload.status]
    );
    const examId = (result as { insertId: number }).insertId;
    await writeAuditLog(response.locals.user.userId, "admin.exam.created", "exam", String(examId), { ...payload, slug });
    response.status(201).json({ id: examId, ...payload, slug, questionCount: 0 });
  } catch (error) { next(error); }
});

router.patch("/exams/:id", async (request, response, next) => {
  try {
    const payload = examUpdateSchema.parse(request.body);
    const columnMap: Record<string, string> = { timeLimitMinutes: "time_limit_minutes", passThreshold: "pass_threshold" };
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      sets.push(`${columnMap[key] ?? key} = ?`);
      vals.push(value as string | number | null);
    }
    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }
    vals.push(Number(request.params.id));
    const [result] = await getPool().execute(`UPDATE exams SET ${sets.join(", ")} WHERE id = ?`, vals);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Exam not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.exam.updated", "exam", request.params.id, payload);
    response.json({ id: Number(request.params.id), ...payload });
  } catch (error) { next(error); }
});

router.patch("/exams/:id/status", async (request, response, next) => {
  try {
    const { status } = z.object({ status: z.enum(["draft", "published"]) }).parse(request.body);
    const [result] = await getPool().execute(`UPDATE exams SET status = ? WHERE id = ?`, [status, request.params.id]);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Exam not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.exam.status", "exam", request.params.id, { status });
    response.json({ id: Number(request.params.id), status });
  } catch (error) { next(error); }
});

// ───────────── CSV Import/Export & Versioning ─────────────

router.get("/questions/export", async (request, response, next) => {
  try {
    const examSlug = request.query.examSlug ? String(request.query.examSlug) : undefined;
    const examId = request.query.examId ? Number(request.query.examId) : undefined;
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    let whereClause: string;
    let whereParam: string | number;
    if (examId) {
      whereClause = "questions.exam_id = ?";
      whereParam = examId;
    } else if (examSlug) {
      whereClause = "exams.slug = ?";
      whereParam = examSlug;
    } else {
      whereClause = "1=1";
      whereParam = 0; // unused
    }

    const query = `SELECT questions.id, questions.question_type AS questionType, questions.prompt,
              questions.option_a AS optionA,
              questions.option_b AS optionB,
              questions.option_c AS optionC,
              questions.option_d AS optionD,
              questions.option_e AS optionE,
              questions.correct_answer AS correctAnswer,
              questions.explanation,
              questions.eco_domain AS ecoDomain,
              questions.performance_domain AS performanceDomain,
              questions.image_url AS imageUrl,
              questions.status,
              questions.difficulty,
              exams.slug AS examSlug
       FROM questions
       INNER JOIN exams ON exams.id = questions.exam_id
       WHERE ${whereClause}
       ORDER BY questions.id ASC`;

    const [rows] = whereClause === "1=1"
      ? await getPool().query<RowDataPacket[]>(query.replace("WHERE 1=1", ""))
      : await getPool().query<RowDataPacket[]>(query, [whereParam]);

    const header = ["id", "questionType", "prompt", "optionA", "optionB", "optionC", "optionD", "optionE", "correctAnswer", "explanation", "ecoDomain", "performanceDomain", "imageUrl", "status", "difficulty"];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          encodeCsvCell(row.id as number),
          encodeCsvCell((row.questionType as string) ?? "single_choice"),
          encodeCsvCell(row.prompt as string),
          encodeCsvCell(row.optionA as string),
          encodeCsvCell(row.optionB as string),
          encodeCsvCell((row.optionC as string) ?? ""),
          encodeCsvCell((row.optionD as string) ?? ""),
          encodeCsvCell((row.optionE as string) ?? ""),
          encodeCsvCell(row.correctAnswer as string),
          encodeCsvCell((row.explanation as string) ?? ""),
          encodeCsvCell((row.ecoDomain as string) ?? ""),
          encodeCsvCell((row.performanceDomain as string) ?? ""),
          encodeCsvCell((row.imageUrl as string) ?? ""),
          encodeCsvCell((row.status as string) ?? "published"),
          encodeCsvCell((row.difficulty as string) ?? "")
        ].join(",")
      );
    }

    await writeAuditLog(response.locals.user.userId, "admin.questions.export", "exam", examSlug ?? String(examId ?? "all"), { count: rows.length });
    const filenameSlug = examSlug ?? (rows.length > 0 ? (rows[0].examSlug as string) : "all");
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename=questions-${filenameSlug}.csv`);
    response.send(lines.join("\n"));
  } catch (error) {
    next(error);
  }
});

router.get("/questions/versions", async (request, response, next) => {
  try {
    const examSlug = String(request.query.examSlug ?? "pmp-mock-01");
    const [examRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM exams WHERE slug = ? LIMIT 1`,
      [examSlug]
    );
    const examId = examRows[0]?.id as number | undefined;
    if (!examId) {
      response.status(404).json({ message: "Exam not found" });
      return;
    }

    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT question_versions.version_no AS versionNo,
              COUNT(*) AS questionCount,
              MAX(question_versions.created_at) AS createdAt,
              MAX(question_versions.import_batch_id) AS importBatchId,
              MAX(users.email) AS createdByEmail
       FROM question_versions
       LEFT JOIN users ON users.id = question_versions.created_by
       WHERE question_versions.exam_id = ?
       GROUP BY question_versions.version_no
       ORDER BY question_versions.version_no DESC
       LIMIT 30`,
      [examId]
    );

    response.json(
      rows.map((row) => ({
        versionNo: Number(row.versionNo),
        questionCount: Number(row.questionCount),
        createdAt: toIsoString(row.createdAt as Date | string),
        importBatchId: row.importBatchId,
        createdByEmail: row.createdByEmail
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post("/questions/import/preview", async (request, response, next) => {
  try {
    const payload = questionImportSchema.parse(request.body);
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    const [examRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM exams WHERE slug = ? LIMIT 1`,
      [payload.examSlug]
    );
    const examId = examRows[0]?.id as number | undefined;
    if (!examId) {
      response.status(404).json({ message: "Exam not found" });
      return;
    }

    const parsed = parseQuestionCsv(payload.csv);
    const [existingRows] = await getPool().query<RowDataPacket[]>(
      `SELECT prompt,
              option_a AS optionA,
              option_b AS optionB,
              option_c AS optionC,
              option_d AS optionD,
              option_e AS optionE,
              correct_answer AS correctAnswer,
              explanation
       FROM questions
       WHERE exam_id = ?
       ORDER BY id ASC`,
      [examId]
    );

    let unchanged = 0;
    let changed = 0;
    const diffRows: Array<{
      row: number;
      status: "added" | "removed" | "changed" | "unchanged";
      changedFields: string[];
      existingPrompt: string | null;
      incomingPrompt: string | null;
    }> = [];
    for (let index = 0; index < Math.min(existingRows.length, parsed.records.length); index += 1) {
      const before = existingRows[index];
      const next = parsed.records[index];
      const changedFields = [
        before.prompt === next.prompt ? null : "prompt",
        before.optionA === next.optionA ? null : "optionA",
        before.optionB === next.optionB ? null : "optionB",
        before.optionC === next.optionC ? null : "optionC",
        before.optionD === next.optionD ? null : "optionD",
        before.optionE === next.optionE ? null : "optionE",
        before.correctAnswer === next.correctAnswer ? null : "correctAnswer",
        before.explanation === next.explanation ? null : "explanation"
      ].filter(Boolean) as string[];

      const same =
        before.prompt === next.prompt &&
        before.optionA === next.optionA &&
        before.optionB === next.optionB &&
        before.optionC === next.optionC &&
        before.optionD === next.optionD &&
        before.optionE === next.optionE &&
        before.correctAnswer === next.correctAnswer &&
        before.explanation === next.explanation;
      if (same) {
        unchanged += 1;
        diffRows.push({
          row: index + 2,
          status: "unchanged",
          changedFields: [],
          existingPrompt: String(before.prompt),
          incomingPrompt: next.prompt
        });
      } else {
        changed += 1;
        diffRows.push({
          row: index + 2,
          status: "changed",
          changedFields,
          existingPrompt: String(before.prompt),
          incomingPrompt: next.prompt
        });
      }
    }

    const importId = crypto.randomUUID();
    await getPool().execute(
      `INSERT INTO question_import_batches (id, exam_id, created_by, csv_text)
       VALUES (?, ?, ?, ?)`,
      [importId, examId, response.locals.user.userId, payload.csv]
    );

    const added = Math.max(parsed.records.length - existingRows.length, 0);
    const removed = Math.max(existingRows.length - parsed.records.length, 0);

    for (let index = existingRows.length; index < parsed.records.length; index += 1) {
      const next = parsed.records[index];
      diffRows.push({
        row: index + 2,
        status: "added",
        changedFields: ["all"],
        existingPrompt: null,
        incomingPrompt: next.prompt
      });
    }

    for (let index = parsed.records.length; index < existingRows.length; index += 1) {
      const before = existingRows[index];
      diffRows.push({
        row: index + 2,
        status: "removed",
        changedFields: ["all"],
        existingPrompt: String(before.prompt),
        incomingPrompt: null
      });
    }

    await writeAuditLog(response.locals.user.userId, "admin.questions.import.preview", "exam", payload.examSlug, {
      importId,
      incoming: parsed.records.length,
      skippedRows: parsed.skippedRows,
      unchanged,
      changed,
      added,
      removed
    });

    response.json({
      importId,
      examSlug: payload.examSlug,
      summary: {
        incoming: parsed.records.length,
        existing: existingRows.length,
        skippedRows: parsed.skippedRows,
        unchanged,
        changed,
        added,
        removed
      },
      sampleIncoming: parsed.records.slice(0, 5),
      diffRows: diffRows.slice(0, 200)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/questions/import/apply", async (request, response, next) => {
  try {
    const payload = questionImportApplySchema.parse(request.body);
    const [batchRows] = await getPool().query<RowDataPacket[]>(
      `SELECT question_import_batches.id,
              question_import_batches.exam_id AS examId,
              question_import_batches.csv_text AS csvText,
              exams.slug AS examSlug,
              question_import_batches.applied_at AS appliedAt
       FROM question_import_batches
       INNER JOIN exams ON exams.id = question_import_batches.exam_id
       WHERE question_import_batches.id = ?
       LIMIT 1`,
      [payload.importId]
    );

    const batch = batchRows[0];
    if (!batch) {
      response.status(404).json({ message: "Import batch not found" });
      return;
    }

    if (batch.appliedAt) {
      response.status(409).json({ message: "Import batch already applied" });
      return;
    }

    const parsed = parseQuestionCsv(batch.csvText as string);
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();

      const [versionRows] = await connection.query<RowDataPacket[]>(
        `SELECT COALESCE(MAX(version_no), 0) AS maxVersion
         FROM question_versions
         WHERE exam_id = ?`,
        [batch.examId]
      );
      const nextVersion = Number(versionRows[0]?.maxVersion ?? 0) + 1;

      const [existingRows] = await connection.query<RowDataPacket[]>(
        `SELECT prompt,
                option_a AS optionA,
                option_b AS optionB,
                option_c AS optionC,
                option_d AS optionD,
                option_e AS optionE,
                correct_answer AS correctAnswer,
                explanation
         FROM questions
         WHERE exam_id = ?
         ORDER BY id ASC`,
        [batch.examId]
      );

      for (let index = 0; index < existingRows.length; index += 1) {
        const question = existingRows[index];
        await connection.execute(
          `INSERT INTO question_versions (
             exam_id, import_batch_id, version_no, question_order,
             prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, created_by
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            batch.examId,
            batch.id,
            nextVersion,
            index + 1,
            question.prompt,
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD,
            question.optionE,
            question.correctAnswer,
            question.explanation,
            response.locals.user.userId
          ]
        );
      }

      await connection.execute(`DELETE FROM questions WHERE exam_id = ?`, [batch.examId]);
      for (const question of parsed.records) {
        await connection.execute(
          `INSERT INTO questions (exam_id, question_type, prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, eco_domain, performance_domain, image_url, status, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [batch.examId, question.questionType, question.prompt, question.optionA, question.optionB, question.optionC, question.optionD, question.optionE, question.correctAnswer, question.explanation, question.ecoDomain, question.performanceDomain, resolveImageUrl(question.imageUrl), question.status, question.difficulty]
        );
      }

      await connection.execute(
        `UPDATE question_import_batches
         SET applied_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [batch.id]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await writeAuditLog(response.locals.user.userId, "admin.questions.import.apply", "exam", String(batch.examSlug), {
      importId: batch.id,
      imported: parsed.records.length,
      skippedRows: parsed.skippedRows
    });

    response.status(201).json({
      importId: batch.id,
      examSlug: batch.examSlug,
      imported: parsed.records.length,
      skippedRows: parsed.skippedRows
    });
  } catch (error) {
    next(error);
  }
});

router.post("/questions/import", async (request, response, next) => {
  try {
    const previewPayload = questionImportSchema.parse(request.body);
    const parsed = parseQuestionCsv(previewPayload.csv);
    const [examRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM exams WHERE slug = ? LIMIT 1`,
      [previewPayload.examSlug]
    );
    const examId = examRows[0]?.id as number | undefined;
    if (!examId) {
      response.status(404).json({ message: "Exam not found" });
      return;
    }

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`DELETE FROM questions WHERE exam_id = ?`, [examId]);

      for (const question of parsed.records) {
        await connection.execute(
          `INSERT INTO questions (exam_id, question_type, prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, eco_domain, performance_domain, image_url, status, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [examId, question.questionType, question.prompt, question.optionA, question.optionB, question.optionC, question.optionD, question.optionE, question.correctAnswer, question.explanation, question.ecoDomain, question.performanceDomain, question.imageUrl, question.status, question.difficulty]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await writeAuditLog(response.locals.user.userId, "admin.questions.import.legacy", "exam", previewPayload.examSlug, {
      imported: parsed.records.length,
      skippedRows: parsed.skippedRows
    });

    response.status(201).json({
      examSlug: previewPayload.examSlug,
      imported: parsed.records.length,
      skippedRows: parsed.skippedRows
    });
  } catch (error) {
    next(error);
  }
});

router.post("/questions/rollback", async (request, response, next) => {
  try {
    const payload = questionRollbackSchema.parse(request.body);
    const [examRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM exams WHERE slug = ? LIMIT 1`,
      [payload.examSlug]
    );
    const examId = examRows[0]?.id as number | undefined;
    if (!examId) {
      response.status(404).json({ message: "Exam not found" });
      return;
    }

    const [versionRows] = await getPool().query<RowDataPacket[]>(
      `SELECT question_order AS questionOrder,
              prompt,
              option_a AS optionA,
              option_b AS optionB,
              option_c AS optionC,
              option_d AS optionD,
              option_e AS optionE,
              correct_answer AS correctAnswer,
              explanation
       FROM question_versions
       WHERE exam_id = ? AND version_no = ?
       ORDER BY question_order ASC`,
      [examId, payload.versionNo]
    );

    if (versionRows.length === 0) {
      response.status(404).json({ message: "Version not found" });
      return;
    }

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();

      const [nextRows] = await connection.query<RowDataPacket[]>(
        `SELECT COALESCE(MAX(version_no), 0) AS maxVersion
         FROM question_versions
         WHERE exam_id = ?`,
        [examId]
      );
      const backupVersion = Number(nextRows[0]?.maxVersion ?? 0) + 1;

      const [currentRows] = await connection.query<RowDataPacket[]>(
        `SELECT prompt,
                option_a AS optionA,
                option_b AS optionB,
                option_c AS optionC,
                option_d AS optionD,
                option_e AS optionE,
                correct_answer AS correctAnswer,
                explanation
         FROM questions
         WHERE exam_id = ?
         ORDER BY id ASC`,
        [examId]
      );

      for (let index = 0; index < currentRows.length; index += 1) {
        const question = currentRows[index];
        await connection.execute(
          `INSERT INTO question_versions (
             exam_id, import_batch_id, version_no, question_order,
             prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, created_by
           )
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            examId,
            backupVersion,
            index + 1,
            question.prompt,
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD,
            question.optionE,
            question.correctAnswer,
            question.explanation,
            response.locals.user.userId
          ]
        );
      }

      await connection.execute(`DELETE FROM questions WHERE exam_id = ?`, [examId]);
      for (const question of versionRows) {
        await connection.execute(
          `INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [examId, question.prompt, question.optionA, question.optionB, question.optionC, question.optionD, question.optionE, question.correctAnswer, question.explanation]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await writeAuditLog(response.locals.user.userId, "admin.questions.rollback", "exam", payload.examSlug, {
      versionNo: payload.versionNo,
      restoredQuestions: versionRows.length
    });

    response.status(201).json({
      examSlug: payload.examSlug,
      restoredVersion: payload.versionNo,
      restoredQuestions: versionRows.length
    });
  } catch (error) {
    next(error);
  }
});

// ───────────── Category Management ─────────────

router.get("/categories", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query(`SELECT id, slug, name, description, created_at AS createdAt FROM categories ORDER BY name ASC`);
    response.json(rows);
  } catch (error) { next(error); }
});

router.post("/categories", async (request, response, next) => {
  try {
    const payload = categoryCreateSchema.parse(request.body);
    const [result] = await getPool().execute(
      `INSERT INTO categories (slug, name, description) VALUES (?, ?, ?)`,
      [payload.slug, payload.name, payload.description ?? null]
    );
    const categoryId = (result as { insertId: number }).insertId;
    await writeAuditLog(response.locals.user.userId, "admin.category.created", "category", String(categoryId), payload);
    response.status(201).json({ id: categoryId, ...payload });
  } catch (error) { next(error); }
});

// ───────────── ECO Domain Management ─────────────

router.get("/eco-domains", async (request, response, next) => {
  try {
    const productId = request.query.productId ? Number(request.query.productId) : null;
    let query = `SELECT id, product_id AS productId, name, description, created_at AS createdAt FROM eco_domains`;
    const params: unknown[] = [];
    if (productId) { query += ` WHERE product_id = ?`; params.push(productId); }
    query += ` ORDER BY name ASC`;
    const [rows] = await getPool().query(query, params);
    response.json(rows);
  } catch (error) { next(error); }
});

router.post("/eco-domains", async (request, response, next) => {
  try {
    const payload = domainCreateSchema.parse(request.body);
    const [result] = await getPool().execute(
      `INSERT INTO eco_domains (product_id, name, description) VALUES (?, ?, ?)`,
      [payload.productId, payload.name, payload.description ?? null]
    );
    const id = (result as { insertId: number }).insertId;
    await writeAuditLog(response.locals.user.userId, "admin.eco-domain.created", "eco_domain", String(id), payload);
    response.status(201).json({ id, ...payload });
  } catch (error) { next(error); }
});

router.patch("/eco-domains/:id", async (request, response, next) => {
  try {
    const payload = domainUpdateSchema.parse(request.body);
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      sets.push(`${key} = ?`);
      vals.push(value as string | null);
    }
    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }
    vals.push(Number(request.params.id));
    const [result] = await getPool().execute(`UPDATE eco_domains SET ${sets.join(", ")} WHERE id = ?`, vals);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "ECO Domain not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.eco-domain.updated", "eco_domain", request.params.id, payload);
    response.json({ id: Number(request.params.id), ...payload });
  } catch (error) { next(error); }
});

router.delete("/eco-domains/:id", async (request, response, next) => {
  try {
    const [result] = await getPool().execute(`DELETE FROM eco_domains WHERE id = ?`, [request.params.id]);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "ECO Domain not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.eco-domain.deleted", "eco_domain", request.params.id, {});
    response.status(204).send();
  } catch (error) { next(error); }
});

// ───────────── Performance Domain Management ─────────────

router.get("/performance-domains", async (request, response, next) => {
  try {
    const productId = request.query.productId ? Number(request.query.productId) : null;
    let query = `SELECT id, product_id AS productId, name, description, created_at AS createdAt FROM performance_domains`;
    const params: unknown[] = [];
    if (productId) { query += ` WHERE product_id = ?`; params.push(productId); }
    query += ` ORDER BY name ASC`;
    const [rows] = await getPool().query(query, params);
    response.json(rows);
  } catch (error) { next(error); }
});

router.post("/performance-domains", async (request, response, next) => {
  try {
    const payload = domainCreateSchema.parse(request.body);
    const [result] = await getPool().execute(
      `INSERT INTO performance_domains (product_id, name, description) VALUES (?, ?, ?)`,
      [payload.productId, payload.name, payload.description ?? null]
    );
    const id = (result as { insertId: number }).insertId;
    await writeAuditLog(response.locals.user.userId, "admin.performance-domain.created", "performance_domain", String(id), payload);
    response.status(201).json({ id, ...payload });
  } catch (error) { next(error); }
});

router.patch("/performance-domains/:id", async (request, response, next) => {
  try {
    const payload = domainUpdateSchema.parse(request.body);
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      sets.push(`${key} = ?`);
      vals.push(value as string | null);
    }
    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }
    vals.push(Number(request.params.id));
    const [result] = await getPool().execute(`UPDATE performance_domains SET ${sets.join(", ")} WHERE id = ?`, vals);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Performance Domain not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.performance-domain.updated", "performance_domain", request.params.id, payload);
    response.json({ id: Number(request.params.id), ...payload });
  } catch (error) { next(error); }
});

router.delete("/performance-domains/:id", async (request, response, next) => {
  try {
    const [result] = await getPool().execute(`DELETE FROM performance_domains WHERE id = ?`, [request.params.id]);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Performance Domain not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.performance-domain.deleted", "performance_domain", request.params.id, {});
    response.status(204).send();
  } catch (error) { next(error); }
});

export default router;
