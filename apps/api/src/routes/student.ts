import { Router } from "express";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { getPool } from "../db.js";
import { sampleQuestions } from "../fixtures.js";
import { getDatabaseReady, getExamBySlug, getProductBySlug, hasActiveEnrollment, parseJsonField, serializeAttemptRow, toIsoString, writeAuditLog } from "../helpers.js";
import { progressSchema } from "../schemas.js";
import { requireAuth } from "../middleware/auth.js";
import { attempts } from "../store.js";
import type { AttemptRecord, AttemptRow } from "../types.js";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Deterministic shuffle using a seed string (Fisher-Yates with seeded PRNG). */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  // Simple seeded PRNG (mulberry32) from the seed hash
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  function next() {
    h |= 0; h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildShuffledOptions(row: RowDataPacket, seed: string) {
  const keys = row.questionType === "true_false" ? ["A", "B"] : ["A", "B", "C", "D", "E"];
  const options = keys
    .map((key) => ({ key, text: row[`option${key}`] as string | null | undefined }))
    .filter((option) => option.text && String(option.text).trim().length > 0);
  return seededShuffle(options, seed).map((option, index) => ({
    originalKey: option.key,
    displayLabel: String.fromCharCode(65 + index),
    text: String(option.text)
  }));
}

const router = Router();

router.get("/enrollments", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json([]);
      return;
    }

    const [rows] = await getPool().query(
      `SELECT enrollments.id, products.slug AS productSlug, products.title AS productTitle,
              enrollments.status, enrollments.starts_at AS startsAt, enrollments.expires_at AS expiresAt
       FROM enrollments
       INNER JOIN products ON products.id = enrollments.product_id
       WHERE enrollments.user_id = ?
       ORDER BY enrollments.id DESC`,
      [user.userId]
    );

    response.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/exams/:slug/access", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    const exam = await getExamBySlug(request.params.slug);
    if (!exam) {
      response.status(404).json({ message: "Exam not found" });
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json({ hasAccess: false });
      return;
    }

    const hasAccess = await hasActiveEnrollment(user.userId, exam.productId);
    response.json({ hasAccess });
  } catch (error) {
    next(error);
  }
});

// Check if user has active enrollment for a product by slug
router.get("/products/:slug/enrollment", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) {
      response.status(401).json({ hasAccess: false });
      return;
    }

    const product = await getProductBySlug(request.params.slug);
    if (!product) {
      response.status(404).json({ message: "Product not found" });
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json({ hasAccess: false });
      return;
    }

    const hasAccess = await hasActiveEnrollment(user.userId, product.id);
    
    if (!hasAccess) {
      response.json({ hasAccess: false });
      return;
    }

    // Get enrollment details
    const [rows] = await getPool().query(
      `SELECT id, expires_at AS expiresAt
       FROM enrollments
       WHERE user_id = ? AND product_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP
       ORDER BY expires_at DESC
       LIMIT 1`,
      [user.userId, product.id]
    );
    
    const enrollment = (rows as { id: number; expiresAt: Date | string }[])[0];
    
    response.json({
      hasAccess: true,
      expiresAt: enrollment ? toIsoString(enrollment.expiresAt) : null
    });
  } catch (error) {
    next(error);
  }
});

// Return the latest in-progress attempt for this exam (if any)
router.get("/exams/:slug/in-progress", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;

    const exam = await getExamBySlug(request.params.slug);
    if (!exam) { response.status(404).json({ message: "Exam not found" }); return; }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      // Search in-memory store for an in-progress attempt matching this exam
      const match = [...attempts.values()]
        .filter((a) => a.examSlug === request.params.slug && a.status === "in_progress")
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
      response.json(match ?? null);
      return;
    }

    // Use MySQL's NOW() to calculate remaining time (avoids clock skew between app and DB servers)
    const [rows] = await getPool().query(
      `SELECT attempts.id, exams.slug AS examSlug, attempts.started_at AS startedAt,
              attempts.answers_json AS answersJson,
              attempts.marked_for_review_json AS markedForReviewJson,
              attempts.training_mode AS trainingMode,
              attempts.status, attempts.submitted_at AS submittedAt,
              GREATEST(0, (? * 60) - TIMESTAMPDIFF(SECOND, attempts.started_at, UTC_TIMESTAMP())) AS remainingSeconds
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.user_id = ? AND exams.slug = ? AND attempts.status = 'in_progress'
       ORDER BY attempts.started_at DESC
       LIMIT 1`,
      [exam.timeLimitMinutes || 30, user.userId, request.params.slug]
    );

    const attempt = (rows as (AttemptRow & { remainingSeconds: number })[])[0];
    if (!attempt) { response.json(null); return; }

    const result = serializeAttemptRow(attempt);
    // Add progress info using exam data from getExamBySlug
    const answers = parseJsonField<Record<string, string>>(attempt.answersJson, {});
    const answeredCount = Object.keys(answers).length;
    
    // Use remainingSeconds calculated by MySQL (avoids clock skew issues)
    // MySQL may return this as a string or BigInt, so convert to Number
    const remainingSeconds = Number(attempt.remainingSeconds ?? 0);
    
    response.json({
      ...result,
      timeLimitMinutes: exam.timeLimitMinutes || 30,
      questionCount: exam.questionCount || 0,
      answeredCount,
      remainingMinutes: Math.ceil(remainingSeconds / 60)
    });
  } catch (error) { next(error); }
});

// Get exam summary info including in-progress status and attempt count
router.get("/exams/:slug/summary", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;

    const exam = await getExamBySlug(request.params.slug);
    if (!exam) { response.status(404).json({ message: "Exam not found" }); return; }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json({
        examSlug: request.params.slug,
        inProgress: null,
        submittedCount: 0
      });
      return;
    }

    // Get in-progress attempt with progress info
    // Use MySQL's NOW() to calculate remaining time (avoids clock skew between app and DB servers)
    const [inProgressRows] = await getPool().query(
      `SELECT attempts.id, attempts.started_at AS startedAt,
              attempts.answers_json AS answersJson,
              attempts.training_mode AS trainingMode,
              GREATEST(0, (? * 60) - TIMESTAMPDIFF(SECOND, attempts.started_at, UTC_TIMESTAMP())) AS remainingSeconds
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.user_id = ? AND exams.slug = ? AND attempts.status = 'in_progress'
       ORDER BY attempts.started_at DESC
       LIMIT 1`,
      [exam.timeLimitMinutes || 30, user.userId, request.params.slug]
    );

    // Get count of submitted (completed) attempts (excluding training mode)
    const [countRows] = await getPool().query(
      `SELECT COUNT(*) as count
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.user_id = ? AND exams.slug = ? AND attempts.status = 'submitted' AND attempts.training_mode = 0`,
      [user.userId, request.params.slug]
    );

    const inProgress = (inProgressRows as (AttemptRow & { remainingSeconds: number })[])[0];
    const submittedCount = Number((countRows as { count: number }[])[0]?.count ?? 0);

    if (!inProgress) {
      response.json({
        examSlug: request.params.slug,
        inProgress: null,
        submittedCount
      });
      return;
    }

    const answers = parseJsonField<Record<string, string>>(inProgress.answersJson, {});
    const answeredCount = Object.keys(answers).length;
    
    // Use the remainingSeconds calculated by MySQL (avoids clock skew issues)
    // MySQL may return this as a string or BigInt, so convert to Number
    const startedAtIso = toIsoString(inProgress.startedAt);
    const remainingSeconds = Number(inProgress.remainingSeconds ?? 0);

    response.json({
      examSlug: request.params.slug,
      inProgress: {
        id: inProgress.id,
        startedAt: startedAtIso,
        trainingMode: Boolean(inProgress.trainingMode),
        questionCount: exam.questionCount || 0,
        answeredCount,
        remainingMinutes: Math.ceil(remainingSeconds / 60)
      },
      submittedCount
    });
  } catch (error) { next(error); }
});

router.post("/exams/:slug/attempts", async (request, response, next) => {
  try {
    const payload = z.object({ trainingMode: z.boolean().optional() }).parse(request.body ?? {});
    const trainingMode = payload.trainingMode ?? false;
    const exam = await getExamBySlug(request.params.slug);
    if (!exam) {
      response.status(404).json({ message: "Exam not found" });
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      const attemptId = crypto.randomUUID();
      const attempt: AttemptRecord = {
        id: attemptId,
        examSlug: exam.slug,
        startedAt: new Date().toISOString(),
        answers: {},
        markedForReview: [],
        trainingMode,
        status: "in_progress"
      };

      attempts.set(attemptId, attempt);
      response.status(201).json(attempt);
      return;
    }

    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    if (!(await hasActiveEnrollment(user.userId, exam.productId))) {
      response.status(403).json({ message: "Active enrollment required before starting attempts" });
      return;
    }

    // Return existing in-progress attempt instead of creating a duplicate
    const [existingRows] = await getPool().query(
      `SELECT attempts.id, exams.slug AS examSlug, attempts.started_at AS startedAt,
              attempts.answers_json AS answersJson,
              attempts.marked_for_review_json AS markedForReviewJson,
              attempts.training_mode AS trainingMode,
              attempts.status, attempts.submitted_at AS submittedAt
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.user_id = ? AND exams.slug = ? AND attempts.status = 'in_progress'
       ORDER BY attempts.started_at DESC
       LIMIT 1`,
      [user.userId, request.params.slug]
    );
    const existingAttempt = (existingRows as AttemptRow[])[0];
    if (existingAttempt) {
      response.json(serializeAttemptRow(existingAttempt));
      return;
    }

    const attemptId = crypto.randomUUID();
    await getPool().execute(
      `INSERT INTO attempts (id, user_id, exam_id, status, training_mode, answers_json, marked_for_review_json, total_questions)
       VALUES (?, ?, ?, 'in_progress', ?, ?, ?, ?)`,
      [attemptId, user.userId, exam.id, trainingMode ? 1 : 0, JSON.stringify({}), JSON.stringify([]), exam.questionCount]
    );

    const attempt: AttemptRecord = {
      id: attemptId,
      examSlug: exam.slug,
      startedAt: new Date().toISOString(),
      answers: {},
      markedForReview: [],
      trainingMode,
      status: "in_progress"
    };

    await writeAuditLog(user.userId, "attempt.started", "attempt", attemptId, { examSlug: exam.slug, trainingMode });
    response.status(201).json(attempt);
  } catch (error) {
    next(error);
  }
});

router.get("/attempts/:id", async (request, response, next) => {
  try {
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      const attempt = attempts.get(request.params.id);
      if (!attempt) {
        response.status(404).json({ message: "Attempt not found" });
        return;
      }

      response.json(attempt);
      return;
    }

    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    const [rows] = await getPool().query(
      `SELECT attempts.id, exams.slug AS examSlug, attempts.started_at AS startedAt,
              attempts.answers_json AS answersJson,
              attempts.marked_for_review_json AS markedForReviewJson,
              attempts.training_mode AS trainingMode,
              attempts.status,
              attempts.submitted_at AS submittedAt
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.id = ? AND attempts.user_id = ?
       LIMIT 1`,
      [request.params.id, user.userId]
    );

    const attempt = (rows as AttemptRow[])[0];
    if (!attempt) {
      response.status(404).json({ message: "Attempt not found" });
      return;
    }

    response.json(serializeAttemptRow(attempt));
  } catch (error) {
    next(error);
  }
});

// Fetch questions for an in-progress attempt (without correct answers)
router.get("/attempts/:id/questions", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const [attemptRows] = await getPool().query<RowDataPacket[]>(
      `SELECT attempts.id, exams.id AS examId, attempts.status, attempts.training_mode AS trainingMode
       FROM attempts INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.id = ? AND attempts.user_id = ? LIMIT 1`,
      [request.params.id, user.userId]
    );
    if (attemptRows.length === 0) { response.status(404).json({ message: "Attempt not found" }); return; }
    const includeTrainingFields = Boolean(attemptRows[0].trainingMode);
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, question_type AS questionType, prompt, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD,
              option_e AS optionE, correct_answer AS correctAnswer, explanation, image_url AS imageUrl
       FROM questions WHERE exam_id = ? AND status = 'published' ORDER BY id ASC`,
      [attemptRows[0].examId]
    );
    // Deterministic shuffle using attempt ID as seed — same order on resume
    const shuffled = seededShuffle(rows as RowDataPacket[], request.params.id);
    response.json(shuffled.map((row) => {
      const options = buildShuffledOptions(row, `${request.params.id}:${row.id}`);
      if (includeTrainingFields) {
        return { ...row, options };
      }
      const { correctAnswer: _correctAnswer, explanation: _explanation, ...safeRow } = row;
      return { ...safeRow, options };
    }));
  } catch (error) { next(error); }
});

router.patch("/attempts/:id/progress", async (request, response, next) => {
  try {
    const payload = progressSchema.parse(request.body);
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      const attempt = attempts.get(request.params.id);
      if (!attempt) {
        response.status(404).json({ message: "Attempt not found" });
        return;
      }

      attempt.answers = payload.answers;
      attempt.markedForReview = payload.markedForReview;
      response.json(attempt);
      return;
    }

    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    const [result] = await getPool().execute(
      `UPDATE attempts
       SET answers_json = ?, marked_for_review_json = ?
       WHERE id = ? AND user_id = ? AND status = 'in_progress'`,
      [JSON.stringify(payload.answers), JSON.stringify(payload.markedForReview), request.params.id, user.userId]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      response.status(404).json({ message: "Attempt not found" });
      return;
    }

    const [rows] = await getPool().query(
      `SELECT attempts.id, exams.slug AS examSlug, attempts.started_at AS startedAt,
              attempts.answers_json AS answersJson,
              attempts.marked_for_review_json AS markedForReviewJson,
              attempts.training_mode AS trainingMode,
              attempts.status,
              attempts.submitted_at AS submittedAt
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.id = ? AND attempts.user_id = ?
       LIMIT 1`,
      [request.params.id, user.userId]
    );

    response.json(serializeAttemptRow((rows as AttemptRow[])[0]));
  } catch (error) {
    next(error);
  }
});

router.post("/attempts/:id/submit", async (request, response, next) => {
  try {
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      const attempt = attempts.get(request.params.id);
      if (!attempt) {
        response.status(404).json({ message: "Attempt not found" });
        return;
      }

      // For training mode, just calculate score without persisting
      const score = Object.entries(attempt.answers).reduce((total, [questionId, answer]) => {
        const question = sampleQuestions.find((item) => item.id === Number(questionId));
        return total + (question?.correctAnswer === answer ? 1 : 0);
      }, 0);

      // Delete training mode attempts (don't persist since user saw answers)
      if (attempt.trainingMode) {
        attempts.delete(request.params.id);
      } else {
        attempt.status = "submitted";
      }

      response.json({
        attemptId: attempt.id,
        score,
        totalQuestions: sampleQuestions.length,
        submittedAt: new Date().toISOString()
      });
      return;
    }

    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    // First check if this is a training mode attempt
    const [trainingCheck] = await getPool().query(
      `SELECT training_mode AS trainingMode FROM attempts WHERE id = ? AND user_id = ?`,
      [request.params.id, user.userId]
    );
    
    const isTrainingMode = Boolean((trainingCheck as { trainingMode: number }[])[0]?.trainingMode);

    const [rows] = await getPool().query(
      `SELECT attempts.id, attempts.answers_json AS answersJson, attempts.total_questions AS totalQuestions,
              questions.id AS questionId, questions.correct_answer AS correctAnswer, questions.question_type AS questionType
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       LEFT JOIN questions ON questions.exam_id = exams.id
       WHERE attempts.id = ? AND attempts.user_id = ?`,
      [request.params.id, user.userId]
    );

    const attemptRows = rows as Array<{
      id: string;
      answersJson: string;
      totalQuestions: number;
      questionId: number | null;
      questionType: string;
      correctAnswer: string | null;
    }>;

    if (attemptRows.length === 0) {
      response.status(404).json({ message: "Attempt not found" });
      return;
    }

    const dbAnswers = parseJsonField<Record<string, string>>(attemptRows[0].answersJson, {});
    // Use client-submitted answers as fallback if DB answers are empty (auto-save may have failed)
    const bodyAnswers = (request.body && typeof request.body === "object" && request.body.answers && typeof request.body.answers === "object")
      ? request.body.answers as Record<string, string>
      : {};
    const answers = Object.keys(dbAnswers).length > 0 ? dbAnswers : bodyAnswers;

    const score = attemptRows.reduce((total, row) => {
      if (!row.questionId || !row.correctAnswer) {
        return total;
      }

      const userAnswer = answers[String(row.questionId)] ?? "";
      if (row.questionType === "multiple_response") {
        // Compare as arrays: correct if user selected exactly the right options
        const correctParts = row.correctAnswer.split(",").map(s => s.trim());
        const userParts = userAnswer.split(",").map(s => s.trim()).filter(Boolean);
        const match = correctParts.length === userParts.length && correctParts.every(c => userParts.includes(c));
        return total + (match ? 1 : 0);
      }
      return total + (userAnswer === row.correctAnswer ? 1 : 0);
    }, 0);

    // For training mode: delete the attempt (don't persist since user saw answers)
    if (isTrainingMode) {
      await getPool().execute(
        `DELETE FROM attempts WHERE id = ? AND user_id = ?`,
        [request.params.id, user.userId]
      );
      response.json({
        attemptId: request.params.id,
        score,
        totalQuestions: attemptRows[0].totalQuestions,
        submittedAt: new Date().toISOString()
      });
      return;
    }

    // For regular mode: persist as submitted
    await getPool().execute(
      `UPDATE attempts
       SET status = 'submitted', score = ?, submitted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [score, request.params.id, user.userId]
    );

    await writeAuditLog(user.userId, "attempt.submitted", "attempt", request.params.id, { score });
    response.json({
      attemptId: request.params.id,
      score,
      totalQuestions: attemptRows[0].totalQuestions,
      submittedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.get("/attempts/:id/results", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT attempts.id, attempts.score, attempts.total_questions AS totalQuestions,
              attempts.answers_json AS answersJson, attempts.started_at AS startedAt,
              attempts.submitted_at AS submittedAt, exams.slug AS examSlug, exams.title AS examTitle,
              exams.pass_threshold AS passThreshold
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.id = ? AND attempts.user_id = ? AND attempts.status = 'submitted'
       LIMIT 1`,
      [request.params.id, user.userId]
    );
    if (rows.length === 0) { response.status(404).json({ message: "Submitted attempt not found" }); return; }
    const attempt = rows[0];
    const answers = parseJsonField<Record<string, string>>(attempt.answersJson, {});
    const [questionRows] = await getPool().query<RowDataPacket[]>(
      `SELECT questions.id, questions.question_type AS questionType, questions.prompt, questions.option_a AS optionA, questions.option_b AS optionB, questions.option_c AS optionC, questions.option_d AS optionD,
              questions.option_e AS optionE, questions.correct_answer AS correctAnswer, questions.explanation
       FROM questions
       INNER JOIN exams ON exams.id = questions.exam_id
       WHERE exams.slug = ?
       ORDER BY questions.id ASC`,
      [attempt.examSlug]
    );
    const questions = questionRows.map((q) => {
      const userAnswer = answers[String(q.id)] ?? null;
      let isCorrect = false;
      if (userAnswer && q.correctAnswer) {
        if (q.questionType === "multiple_response") {
          const correctParts = (q.correctAnswer as string).split(",").map((s: string) => s.trim());
          const userParts = (userAnswer as string).split(",").map((s: string) => s.trim()).filter(Boolean);
          isCorrect = correctParts.length === userParts.length && correctParts.every((c: string) => userParts.includes(c));
        } else {
          isCorrect = userAnswer === q.correctAnswer;
        }
      }
      return {
        id: Number(q.id),
        questionType: q.questionType ?? "single_choice",
        prompt: q.prompt,
        optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, optionE: q.optionE,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        selectedAnswer: userAnswer,
        isCorrect
      };
    });
    response.json({
      attemptId: attempt.id,
      examSlug: attempt.examSlug,
      examTitle: attempt.examTitle,
      score: Number(attempt.score),
      totalQuestions: Number(attempt.totalQuestions),
      passThreshold: Number(attempt.passThreshold),
      passed: Number(attempt.score) >= Math.ceil(Number(attempt.totalQuestions) * Number(attempt.passThreshold) / 100),
      startedAt: toIsoString(attempt.startedAt as Date | string),
      submittedAt: toIsoString(attempt.submittedAt as Date | string),
      questions
    });
  } catch (error) { next(error); }
});

router.get("/attempts", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT attempts.id, exams.slug AS examSlug, exams.title AS examTitle,
              attempts.status, attempts.score, attempts.total_questions AS totalQuestions,
              attempts.started_at AS startedAt, attempts.submitted_at AS submittedAt
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       WHERE attempts.user_id = ?
       ORDER BY attempts.started_at DESC
       LIMIT 50`,
      [user.userId]
    );
    response.json(rows.map((r) => ({
      ...r,
      score: r.score !== null ? Number(r.score) : null,
      totalQuestions: Number(r.totalQuestions),
      startedAt: toIsoString(r.startedAt as Date | string),
      submittedAt: toIsoString(r.submittedAt as Date | string | null)
    })));
  } catch (error) { next(error); }
});

router.get("/exam-goal", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT exam_date AS examDate, certification_label AS certificationLabel, updated_at AS updatedAt
       FROM user_exam_goals
       WHERE user_id = ?
       LIMIT 1`,
      [user.userId]
    );
    const row = rows[0];
    response.json(row ? {
      examDate: row.examDate instanceof Date ? row.examDate.toISOString().slice(0, 10) : String(row.examDate).slice(0, 10),
      certificationLabel: row.certificationLabel,
      updatedAt: toIsoString(row.updatedAt as Date | string)
    } : null);
  } catch (error) { next(error); }
});

router.put("/exam-goal", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const payload = z.object({
      examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      certificationLabel: z.string().max(120).optional()
    }).parse(request.body);
    await getPool().execute(
      `INSERT INTO user_exam_goals (user_id, exam_date, certification_label)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         exam_date = VALUES(exam_date),
         certification_label = VALUES(certification_label)`,
      [user.userId, payload.examDate, payload.certificationLabel?.trim() || null]
    );
    await writeAuditLog(user.userId, "exam_goal.updated", "user", String(user.userId), payload);
    response.json({ examDate: payload.examDate, certificationLabel: payload.certificationLabel?.trim() || null });
  } catch (error) { next(error); }
});

router.get("/orders", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT orders.id, products.title AS productTitle, orders.status, orders.total_amount AS totalAmount,
              orders.gateway_reference AS gatewayReference, orders.created_at AS createdAt
       FROM orders
       INNER JOIN products ON products.id = orders.product_id
       WHERE orders.user_id = ?
       ORDER BY orders.id DESC LIMIT 50`,
      [user.userId]
    );
    response.json(rows.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) })));
  } catch (error) { next(error); }
});

router.get("/pdpa-requests", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, request_type AS requestType, message, status, created_at AS createdAt,
              updated_at AS updatedAt, completed_at AS completedAt
       FROM pdpa_requests
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 20`,
      [user.userId]
    );
    response.json(rows.map((row) => ({
      id: Number(row.id),
      requestType: row.requestType,
      message: row.message,
      status: row.status,
      createdAt: toIsoString(row.createdAt as Date | string),
      updatedAt: toIsoString(row.updatedAt as Date | string),
      completedAt: toIsoString(row.completedAt as Date | string | null)
    })));
  } catch (error) { next(error); }
});

router.post("/pdpa-requests", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const payload = z.object({
      requestType: z.enum(["access", "correction", "deletion", "withdrawal", "other"]),
      message: z.string().max(1000).optional()
    }).parse(request.body);

    const [result] = await getPool().execute(
      `INSERT INTO pdpa_requests (user_id, request_type, message)
       VALUES (?, ?, ?)`,
      [user.userId, payload.requestType, payload.message?.trim() || null]
    );
    const id = (result as { insertId: number }).insertId;
    await writeAuditLog(user.userId, "pdpa.request.created", "pdpa_request", String(id), payload);
    response.status(201).json({ id, status: "pending" });
  } catch (error) { next(error); }
});

// ─── Receipt / Invoice ─────────────────────────────────────────
router.get("/orders/:id/receipt", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT orders.id, orders.status, orders.total_amount AS totalAmount,
              orders.gateway_provider AS gatewayProvider, orders.gateway_reference AS gatewayReference,
              orders.created_at AS createdAt, orders.updated_at AS updatedAt,
              products.title AS productTitle, products.description AS productDescription,
              products.access_days AS accessDays,
              users.full_name AS customerName, users.email AS customerEmail
       FROM orders
       INNER JOIN products ON products.id = orders.product_id
       INNER JOIN users ON users.id = orders.user_id
       WHERE orders.id = ? AND orders.user_id = ?
       LIMIT 1`,
      [request.params.id, user.userId]
    );
    if (rows.length === 0) { response.status(404).json({ message: "Order not found" }); return; }
    const order = rows[0];
    if (order.status !== "paid") { response.status(400).json({ message: "Receipt only available for paid orders" }); return; }

    // Check if ?format=html for printable receipt
    if (request.query.format === "html") {
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt #${order.id}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a1a}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:20px;margin-bottom:20px}
.header h1{margin:0;font-size:24px}
.company{text-align:right;font-size:13px;color:#666}
table{width:100%;border-collapse:collapse;margin:20px 0}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #ddd}
th{background:#f5f5f5;font-weight:600}
.total{font-size:18px;font-weight:700}
.footer{margin-top:40px;font-size:12px;color:#888;text-align:center}
@media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div><h1>RECEIPT</h1><p style="margin:4px 0;color:#666">Receipt #${String(order.id).padStart(6, "0")}</p></div>
  <div class="company"><strong>PM Advance Sdn Bhd</strong><br>Practice Exam Platform</div>
</div>
<table>
  <tr><th>Date</th><td>${new Date(order.createdAt).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
  <tr><th>Customer</th><td>${escapeHtml(order.customerName)}<br>${escapeHtml(order.customerEmail)}</td></tr>
  <tr><th>Payment Ref</th><td>${order.gatewayReference ?? "N/A"}</td></tr>
  <tr><th>Status</th><td style="color:#2d8a4e;font-weight:600">PAID</td></tr>
</table>
<table>
  <tr><th>Item</th><th style="text-align:right">Amount (USD)</th></tr>
  <tr><td>${escapeHtml(order.productTitle)} (${order.accessDays} days access)</td><td style="text-align:right">${Number(order.totalAmount).toFixed(2)}</td></tr>
  <tr><td class="total">Total</td><td style="text-align:right" class="total">USD ${Number(order.totalAmount).toFixed(2)}</td></tr>
</table>
<div class="footer">
  <p>Thank you for your purchase. This receipt was generated electronically.</p>
  <p>For support, contact our team at the platform.</p>
</div>
</body></html>`;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.send(html);
      return;
    }

    response.json({
      receiptNumber: String(order.id).padStart(6, "0"),
      orderId: Number(order.id),
      status: order.status,
      totalAmount: Number(order.totalAmount),
      currency: "USD",
      gatewayProvider: order.gatewayProvider,
      gatewayReference: order.gatewayReference,
      productTitle: order.productTitle,
      productDescription: order.productDescription,
      accessDays: order.accessDays,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      paidAt: toIsoString(order.updatedAt as Date | string),
      createdAt: toIsoString(order.createdAt as Date | string),
    });
  } catch (error) { next(error); }
});

// ─── Performance Analytics ────────────────────────────────────────
router.get("/performance", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json({ attempts: [], ecoDomains: [], performanceDomains: [] });
      return;
    }

    // 1) All submitted attempts for this user
    const [attemptRows] = await getPool().query<RowDataPacket[]>(
      `SELECT a.id, a.exam_id AS examId, a.score, a.total_questions AS totalQuestions,
              a.training_mode AS trainingMode, a.answers_json AS answersJson,
              a.started_at AS startedAt, a.submitted_at AS submittedAt,
              e.slug AS examSlug, e.title AS examTitle, e.pass_threshold AS passThreshold
       FROM attempts a
       INNER JOIN exams e ON e.id = a.exam_id
       WHERE a.user_id = ? AND a.status = 'submitted'
       ORDER BY a.submitted_at ASC`,
      [user.userId]
    );

    // Build attempt list for Past Results & Overall trend
    const attempts = attemptRows.map((r) => {
      const score = Number(r.score);
      const total = Number(r.totalQuestions);
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      return {
        id: r.id,
        examSlug: r.examSlug,
        examTitle: r.examTitle,
        score,
        totalQuestions: total,
        scorePercent: pct,
        passed: pct >= Number(r.passThreshold),
        passThreshold: Number(r.passThreshold),
        trainingMode: !!r.trainingMode,
        startedAt: toIsoString(r.startedAt as Date | string),
        submittedAt: toIsoString(r.submittedAt as Date | string),
      };
    });

    // 2) Domain breakdown — gather all exam IDs the user attempted
    const examIds = [...new Set(attemptRows.map((r) => Number(r.examId)))];
    let ecoDomains: Array<{ domain: string; totalQuestions: number; correctAnswers: number; averageScore: number }> = [];
    let performanceDomains: Array<{ domain: string; totalQuestions: number; correctAnswers: number; averageScore: number }> = [];

    if (examIds.length > 0) {
      // Fetch all questions for those exams
      const [questionRows] = await getPool().query<RowDataPacket[]>(
        `SELECT id, exam_id AS examId, correct_answer AS correctAnswer,
                COALESCE(eco_domain, 'Uncategorized') AS ecoDomain,
                COALESCE(performance_domain, 'Uncategorized') AS performanceDomain
         FROM questions
         WHERE exam_id IN (${examIds.map(() => "?").join(",")})`,
        examIds
      );

      // Build question lookup: questionId → { correctAnswer, ecoDomain, performanceDomain }
      const qMap = new Map<string, { correctAnswer: string; ecoDomain: string; performanceDomain: string }>();
      for (const q of questionRows) {
        qMap.set(String(q.id), { correctAnswer: q.correctAnswer, ecoDomain: q.ecoDomain, performanceDomain: q.performanceDomain });
      }

      // Aggregate per-domain stats across all attempts
      const ecoStats = new Map<string, { total: number; correct: number }>();
      const perfStats = new Map<string, { total: number; correct: number }>();

      for (const attempt of attemptRows) {
        const answers = parseJsonField<Record<string, string>>(attempt.answersJson, {});
        for (const [qId, selectedAnswer] of Object.entries(answers)) {
          const q = qMap.get(qId);
          if (!q) continue;
          const isCorrect = selectedAnswer === q.correctAnswer;

          // ECO domain (ecoDomain)
          const eco = ecoStats.get(q.ecoDomain) ?? { total: 0, correct: 0 };
          eco.total++;
          if (isCorrect) eco.correct++;
          ecoStats.set(q.ecoDomain, eco);

          // Performance domain (performanceDomain)
          const perf = perfStats.get(q.performanceDomain) ?? { total: 0, correct: 0 };
          perf.total++;
          if (isCorrect) perf.correct++;
          perfStats.set(q.performanceDomain, perf);
        }
      }

      ecoDomains = [...ecoStats.entries()]
        .map(([domain, s]) => ({
          domain,
          totalQuestions: s.total,
          correctAnswers: s.correct,
          averageScore: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.totalQuestions - a.totalQuestions);

      performanceDomains = [...perfStats.entries()]
        .map(([domain, s]) => ({
          domain,
          totalQuestions: s.total,
          correctAnswers: s.correct,
          averageScore: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.totalQuestions - a.totalQuestions);
    }

    response.json({ attempts, ecoDomains, performanceDomains });
  } catch (error) {
    next(error);
  }
});

// ───────────── Referral: Student-facing endpoints ─────────────

import { ensureReferralCodeForUser } from "./admin/referrals.js";

router.get("/referral/me", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const code = await ensureReferralCodeForUser(user.userId);
    const pool = getPool();
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT total_redemptions AS totalRedemptions, total_reward_myr AS totalRewardMyr
       FROM referral_codes WHERE user_id = ? LIMIT 1`, [user.userId]
    );
    const [recent] = await pool.query<RowDataPacket[]>(
      `SELECT rr.id, rr.status, rr.created_at AS createdAt, rr.rewarded_at AS rewardedAt,
              referee.email AS refereeEmail
       FROM referral_redemptions rr
       INNER JOIN users referee ON referee.id = rr.referee_user_id
       WHERE rr.referrer_user_id = ? ORDER BY rr.id DESC LIMIT 10`, [user.userId]
    );
    response.json({
      code,
      shareUrl: `${request.protocol}://${request.get("host")}/?ref=${code}`,
      totalRedemptions: Number(stats[0]?.totalRedemptions ?? 0),
      totalRewardMyr: Number(stats[0]?.totalRewardMyr ?? 0),
      recent,
    });
  } catch (error) { next(error); }
});

router.get("/referral/validate/:code", async (request, response, next) => {
  try {
    const code = request.params.code.toUpperCase();
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT u.full_name AS referrerName
       FROM referral_codes rc INNER JOIN users u ON u.id = rc.user_id
       WHERE rc.code = ? LIMIT 1`, [code]
    );
    if (rows.length === 0) {
      response.status(404).json({ valid: false, message: "Invalid referral code" });
      return;
    }
    response.json({
      valid: true,
      code,
      referrerName: String(rows[0].referrerName ?? "").split(" ")[0] || "a friend",
    });
  } catch (error) { next(error); }
});

export default router;
