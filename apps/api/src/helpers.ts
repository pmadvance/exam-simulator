import type { RowDataPacket } from "mysql2";
import { canConnectToDatabase, ensureDatabaseTables, getPool } from "./db.js";
import { sampleExams, sampleProducts, sampleQuestions } from "./fixtures.js";
import type { AttemptRecord, AttemptRow, ExamRow, ParsedQuestionCsv, ProductSummaryRow, QuestionPreviewRow, SessionPolicy } from "./types.js";

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Convert a JS Date/ISO string to MySQL TIMESTAMP format `YYYY-MM-DD HH:MM:SS`. */
export function toMySQLDatetime(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function normalizeProduct(row: ProductSummaryRow) {
  const priceUsd = Number(row.priceUsd);
  return {
    ...row,
    priceUsd
  };
}

export function serializeAttemptRow(row: AttemptRow): AttemptRecord {
  return {
    id: row.id,
    examSlug: row.examSlug,
    startedAt: toIsoString(row.startedAt) ?? new Date().toISOString(),
    answers: parseJsonField<Record<string, string>>(row.answersJson, {}),
    markedForReview: parseJsonField<string[]>(row.markedForReviewJson, []),
    trainingMode: Boolean(row.trainingMode),
    status: row.status,
    submittedAt: toIsoString(row.submittedAt)
  };
}

export function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  
  // Debug for first data row
  const isDebugRow = line.includes("A technology development project has the following characteristics");
  if (isDebugRow) {
    console.log('[parseCsvRow] Input line length:', line.length);
    console.log('[parseCsvRow] First 100 chars:', line.substring(0, 100));
  }

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
        if (isDebugRow) {
          console.log(`[parseCsvRow] Quote at index ${index}, inQuotes now: ${inQuotes}`);
        }
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      if (isDebugRow) {
        console.log(`[parseCsvRow] Split at comma, value: "${current.substring(0, 30)}..."`);
      }
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  
  if (isDebugRow) {
    console.log('[parseCsvRow] Total values:', values.length);
    console.log('[parseCsvRow] Value 6 (correctAnswer):', values[6]);
    console.log('[parseCsvRow] Value 7 (explanation start):', values[7]?.substring(0, 50));
  }
  
  return values;
}

export function encodeCsvCell(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function parseQuestionCsv(csvText: string): ParsedQuestionCsv {
  // Pre-process: normalize all line endings to Unix style (\n)
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Parse CSV handling quoted fields that may contain newlines
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;
  
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quoted field - add one quote and skip the next
        currentLine += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state and add the quote character
        inQuotes = !inQuotes;
        currentLine += char;
      }
      continue; // Skip the rest of the loop for quote characters
    } else if (char === '\n' && !inQuotes) {
      // End of line (but not inside quotes)
      const trimmed = currentLine.trim();
      if (trimmed.length > 0) {
        lines.push(trimmed);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  
  // Don't forget the last line
  const trimmed = currentLine.trim();
  if (trimmed.length > 0) {
    lines.push(trimmed);
  }
  
  console.log(`[CSV Parse] Total lines after parsing: ${lines.length}`);

  if (lines.length < 2) {
    throw new Error("CSV must contain header and at least one row");
  }

  // Header alias map — case-insensitive, common variations supported
  // Supports both internal format and client's format (Stem, Key, Option A, etc.)
  const headerAliases: Record<string, string> = {
    // Question text / prompt
    "prompt": "prompt", "question": "prompt", "questiontext": "prompt", "stem": "prompt",
    // Options A-E (various formats)
    "optiona": "optionA", "a": "optionA", "answera": "optionA", "option a": "optionA", "option_a": "optionA",
    "optionb": "optionB", "b": "optionB", "answerb": "optionB", "option b": "optionB", "option_b": "optionB",
    "optionc": "optionC", "c": "optionC", "answerc": "optionC", "option c": "optionC", "option_c": "optionC",
    "optiond": "optionD", "d": "optionD", "answerd": "optionD", "option d": "optionD", "option_d": "optionD",
    "optione": "optionE", "e": "optionE", "answere": "optionE", "option e": "optionE", "option_e": "optionE",
    // Correct answer / key
    "correctanswer": "correctAnswer", "answer": "correctAnswer", "correct": "correctAnswer", 
    "key": "correctAnswer", "keys": "correctAnswer", "correct answer": "correctAnswer",
    "correct_answer": "correctAnswer",
    // Explanation / feedback
    "explanation": "explanation", "rationale": "explanation", "reasoning": "explanation", 
    "feedback": "explanation", "explanations": "explanation",
    // Question type
    "questiontype": "questionType", "type": "questionType", "question type": "questionType",
    "question_type": "questionType",
    // ECO Domain
    "ecodomain": "ecoDomain", "domain": "ecoDomain", "ecotag": "ecoDomain", 
    "eco(domain.task)": "ecoDomain", "eco": "ecoDomain", "eco domain": "ecoDomain",
    "eco_domain": "ecoDomain",
    // Performance Domain / Classification
    "performancedomain": "performanceDomain", "processgroup": "performanceDomain", 
    "perftag": "performanceDomain", "classification": "performanceDomain",
    "performance domain": "performanceDomain", "performance_domain": "performanceDomain",
    // Image URL
    "imageurl": "imageUrl", "image": "imageUrl", "image url": "imageUrl", "image_url": "imageUrl",
    // Status and difficulty
    "status": "status",
    "difficulty": "difficulty", "level": "difficulty",
  };

  const rawHeader = parseCsvRow(lines[0]);
  console.log('[CSV Parse] Raw header:', rawHeader);
  const indexMap: Record<string, number> = {};
  rawHeader.forEach((name, index) => {
    // Strip any trailing \r that might have been preserved from CRLF line endings
    const cleanName = name.replace(/\r+$/, '');
    const normalized = cleanName.toLowerCase().replace(/[\s_-]+/g, "");
    const canonical = headerAliases[normalized] ?? cleanName;
    if (indexMap[canonical] === undefined) indexMap[canonical] = index;
  });
  console.log('[CSV Parse] Index map:', indexMap);

  // Check if this is client CSV format (has "Key" column but no "questionType")
  const hasKeyColumn = indexMap["correctAnswer"] !== undefined && 
    rawHeader.some(h => h.toLowerCase().trim() === "key");
  const hasQuestionTypeColumn = indexMap["questionType"] !== undefined;
  const isClientFormat = hasKeyColumn && !hasQuestionTypeColumn;

  // Required columns: prompt and at least optionA and optionB
  const requiredColumns = ["prompt", "optionA", "optionB"];
  const missingColumns = requiredColumns.filter((column) => indexMap[column] === undefined);
  if (missingColumns.length > 0) {
    const foundColumns = rawHeader.join(", ");
    throw new Error(
      `CSV missing required column(s): ${missingColumns.join(", ")}. ` +
      `Found columns: ${foundColumns}. ` +
      `Accepted aliases: prompt/stem, optionA/Option A, optionB/Option B, correctAnswer/Key, explanation/Feedback`
    );
  }

  /**
   * Infer question type from row data when not explicitly provided.
   * Rules:
   * 1. If only A and B options are filled (C/D/E are empty) → true_false
   * 2. If correct answer contains multiple letters (comma/comma-separated) → multiple_response
   * 3. Otherwise → single_choice
   */
  function inferQuestionType(
    optionC: string, 
    optionD: string, 
    optionE: string, 
    rawAnswer: string
  ): "single_choice" | "multiple_response" | "true_false" {
    // Rule 1: If only A and B have values (C, D, E are empty), it's True/False
    const hasOnlyTwoOptions = !optionC && !optionD && !optionE;
    if (hasOnlyTwoOptions) {
      return "true_false";
    }
    
    // Rule 2: If correct answer has multiple letters separated by comma/comma, it's multiple response
    const answerParts = rawAnswer.split(/[,|;\s]+/).map(p => p.trim()).filter(p => p.length > 0);
    if (answerParts.length > 1) {
      return "multiple_response";
    }
    
    // Default: single choice
    return "single_choice";
  }

  function normalizeQuestionType(
    raw: string | undefined,
    optionC: string,
    optionD: string,
    optionE: string,
    rawAnswer: string
  ): "single_choice" | "multiple_response" | "true_false" {
    // If type is explicitly provided, use it
    if (raw) {
      const v = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
      if (["multipleresponse", "multipleselect", "multi", "msr", "ms"].includes(v)) return "multiple_response";
      if (["truefalse", "tf", "true/false", "boolean"].includes(v)) return "true_false";
      return "single_choice";
    }
    
    // Otherwise, infer from data
    return inferQuestionType(optionC, optionD, optionE, rawAnswer);
  }

  function normalizeCorrectAnswer(
    raw: string, 
    type: "single_choice" | "multiple_response" | "true_false"
  ): string | null {
    const v = (raw ?? "").trim();
    if (!v) return null;
    
    if (type === "true_false") {
      const upper = v.toUpperCase();
      if (["A", "TRUE", "T", "YES", "Y", "1"].includes(upper)) return "A";
      if (["B", "FALSE", "F", "NO", "N", "0"].includes(upper)) return "B";
      return null;
    }
    
    if (type === "multiple_response") {
      // Accept comma- or pipe-separated; output as comma-separated uppercase letters
      const parts = v.split(/[,|;\s]+/)
        .map((p) => p.trim().toUpperCase())
        .filter((p) => /^[A-E]$/.test(p));
      if (parts.length === 0) return null;
      return [...new Set(parts)].sort().join(",");
    }
    
    // Single choice - now supports A-E
    const upper = v.toUpperCase();
    return /^[A-E]$/.test(upper) ? upper : null;
  }

  function normalizeStatus(raw: string | undefined): "draft" | "published" {
    const v = (raw ?? "").trim().toLowerCase();
    return v === "published" || v === "active" || v === "live" ? "published" : "draft";
  }

  const records: ParsedQuestionCsv["records"] = [];
  const skipReasons: ParsedQuestionCsv["skipReasons"] = [];
  let skippedRows = 0;

  lines.slice(1).forEach((line, idx) => {
    const rowNum = idx + 2; // 1-indexed + header offset
    const cols = parseCsvRow(line);
    const get = (key: string) => (indexMap[key] !== undefined ? (cols[indexMap[key]]?.trim() ?? "") : "");

    const prompt = get("prompt");
    const optionA = get("optionA");
    const optionB = get("optionB");
    const optionC = get("optionC");
    const optionD = get("optionD");
    const optionE = get("optionE");
    const explanation = get("explanation");
    const rawAnswer = get("correctAnswer");
    
    // Debug first few rows - show all columns
    if (idx < 3) {
      console.log(`[CSV Parse] Row ${rowNum} full data:`);
      console.log(`  cols.length=${cols.length}`);
      console.log(`  cols[0](prompt)=${cols[0]?.substring(0,30)}...`);
      console.log(`  cols[6](should be correctAnswer)=${cols[6]}`);
      console.log(`  get("correctAnswer")=${rawAnswer}`);
      console.log(`  indexMap[correctAnswer]=${indexMap["correctAnswer"]}`);
    }
    
    // Determine question type: use explicit type if available, otherwise infer from data
    const rawQuestionType = get("questionType");
    const questionType = normalizeQuestionType(rawQuestionType, optionC, optionD, optionE, rawAnswer);

    // Skip empty rows more leniently
    if (!prompt && !optionA && !optionB) { 
      skippedRows++; 
      skipReasons.push({ row: rowNum, reason: "empty row" }); 
      return; 
    }
    
    if (!prompt) { skippedRows++; skipReasons.push({ row: rowNum, reason: "missing prompt" }); return; }
    if (!optionA || !optionB) { skippedRows++; skipReasons.push({ row: rowNum, reason: "missing required options A or B" }); return; }
    
    // Validation: single_choice needs at least options A-D filled
    if (questionType === "single_choice" && (!optionC || !optionD)) {
      // Try to use empty strings for C and D instead of skipping
      if (!optionC || !optionD) {
        // Allow import but log warning - some questions might have fewer options
      }
    }

    const correctAnswer = normalizeCorrectAnswer(rawAnswer, questionType);
    if (!correctAnswer) {
      skippedRows++; skipReasons.push({ row: rowNum, reason: `invalid correctAnswer "${rawAnswer}" for ${questionType}` }); return;
    }

    records.push({
      prompt,
      optionA,
      optionB,
      optionC: questionType === "true_false" ? "" : optionC,
      optionD: questionType === "true_false" ? "" : optionD,
      optionE: questionType === "true_false" ? "" : optionE,
      correctAnswer,
      explanation: explanation || "",
      questionType,
      ecoDomain: get("ecoDomain") || null,
      performanceDomain: get("performanceDomain") || null,
      imageUrl: get("imageUrl") || null,
      status: normalizeStatus(get("status")),
      difficulty: get("difficulty") || null,
    });
  });

  return { records, skippedRows, skipReasons };
}

export async function getDatabaseReady() {
  const databaseReady = await canConnectToDatabase();
  if (databaseReady) {
    await ensureDatabaseTables();
  }

  return databaseReady;
}

export async function writeAuditLog(actorUserId: number | null, actionKey: string, entityType: string, entityId: string, payload: unknown) {
  const databaseReady = await getDatabaseReady();
  if (!databaseReady) {
    return;
  }

  await getPool().execute(
    `INSERT INTO audit_logs (actor_user_id, action_key, entity_type, entity_id, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [actorUserId, actionKey, entityType, entityId, JSON.stringify(payload)]
  );
}

export async function getProductBySlug(slug: string) {
  const databaseReady = await getDatabaseReady();
  if (!databaseReady) {
    return sampleProducts.find((item) => item.slug === slug) ?? null;
  }

  const [rows] = await getPool().query(
    `SELECT id, slug, title, description, category, difficulty, price_usd AS priceUsd, access_days AS accessDays
     FROM products
     WHERE slug = ?
     LIMIT 1`,
    [slug]
  );

  const product = (rows as ProductSummaryRow[])[0];
  return product ? normalizeProduct(product) : null;
}

export async function getExamBySlug(slug: string) {
  const databaseReady = await getDatabaseReady();
  if (!databaseReady) {
    const exam = sampleExams.find((item) => item.slug === slug);
    if (!exam) {
      return null;
    }

    const question = sampleQuestions.find((item) => item.examId === exam.id);
    return {
      ...exam,
      previewQuestion: question
    };
  }

  const [examRows] = await getPool().query(
    `SELECT exams.id, exams.product_id AS productId, exams.slug, exams.title,
            exams.time_limit_minutes AS timeLimitMinutes,
            exams.pass_threshold AS passThreshold,
            (SELECT COUNT(*) FROM questions WHERE questions.exam_id = exams.id) AS questionCount,
            exams.status,
            products.slug AS productSlug
     FROM exams
     INNER JOIN products ON products.id = exams.product_id
     WHERE exams.slug = ?
     LIMIT 1`,
    [slug]
  );

  const exam = (examRows as ExamRow[])[0];
  if (!exam) {
    return null;
  }

  const [questionRows] = await getPool().query(
    `SELECT id, prompt, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD, correct_answer AS correctAnswer, explanation, image_url AS imageUrl
     FROM questions
     WHERE exam_id = ?
     ORDER BY RAND()
     LIMIT 5`,
    [exam.id]
  );

  const questions = (questionRows as (QuestionPreviewRow & { correctAnswer: string; imageUrl?: string | null })[]);

  const trialQuestions = questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    imageUrl: q.imageUrl || null,
  }));

  // Keep backward compat
  const previewQuestion = trialQuestions[0]
    ? { id: trialQuestions[0].id, prompt: trialQuestions[0].prompt, options: trialQuestions[0].options, explanation: trialQuestions[0].explanation }
    : undefined;

  return {
    ...exam,
    previewQuestion,
    trialQuestions,
  };
}

export async function hasActiveEnrollment(userId: number, productId: number) {
  const [rows] = await getPool().query(
    `SELECT id
     FROM enrollments
     WHERE user_id = ?
       AND product_id = ?
       AND status = 'active'
       AND expires_at > CURRENT_TIMESTAMP
     ORDER BY id DESC
     LIMIT 1`,
    [userId, productId]
  );

  return (rows as Array<{ id: number }>).length > 0;
}

export async function getSessionPolicy(userId: number): Promise<SessionPolicy> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT max_sessions AS maxSessions, refresh_ttl_days AS refreshTtlDays
     FROM user_session_policies
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  const row = rows[0];
  return {
    maxSessions: row ? Number(row.maxSessions) || null : null,
    refreshTtlDays: row ? Number(row.refreshTtlDays) || null : null
  };
}

/**
 * Generate a URL-safe slug from a title string.
 * Optionally checks a DB table for uniqueness and appends -2, -3, etc. on collision.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generateUniqueSlug(title: string, table: "products" | "exams"): Promise<string> {
  const base = slugify(title);
  if (!base) throw new Error("Cannot generate slug from empty title");
  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT 1 FROM \`${table}\` WHERE slug = ? LIMIT 1`,
      [candidate]
    );
    if (rows.length === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 100) throw new Error("Too many slug collisions");
  }
}
