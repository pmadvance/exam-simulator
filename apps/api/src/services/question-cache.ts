import type { RowDataPacket } from "mysql2";

import { env } from "../config.js";
import { getPool } from "../db.js";
import { publishRedis, subscribeRedis } from "./redis.js";

export type QuestionCacheStatus = "hit" | "miss" | "coalesced";

export type QuestionCacheResult<T> = {
  status: QuestionCacheStatus;
  value: T;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type AsyncCacheOptions = {
  maxEntries: number;
  ttlMs: number;
};

export class AsyncResourceCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();
  private readonly generations = new Map<K, number>();
  private readonly loads = new Map<K, Promise<V>>();

  constructor(private readonly options: AsyncCacheOptions) {}

  async get(key: K, loader: () => Promise<V>): Promise<QuestionCacheResult<V>> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return { status: "hit", value: cached.value };
    }
    if (cached) this.entries.delete(key);

    const existingLoad = this.loads.get(key);
    if (existingLoad) {
      return { status: "coalesced", value: await existingLoad };
    }

    const generation = this.generations.get(key) ?? 0;
    const load = loader().then((value) => {
      if ((this.generations.get(key) ?? 0) === generation) {
        this.store(key, value);
      }
      return value;
    });
    this.loads.set(key, load);

    try {
      return { status: "miss", value: await load };
    } finally {
      if (this.loads.get(key) === load) this.loads.delete(key);
    }
  }

  invalidate(key: K) {
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    this.entries.delete(key);
    this.loads.delete(key);
  }

  clear() {
    for (const key of new Set([...this.entries.keys(), ...this.loads.keys()])) {
      this.invalidate(key);
    }
  }

  get size() {
    return this.entries.size;
  }

  private store(key: K, value: V) {
    if (this.entries.has(key)) this.entries.delete(key);
    while (this.entries.size >= this.options.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
    this.entries.set(key, {
      expiresAt: Date.now() + this.options.ttlMs,
      value,
    });
  }
}

export const publishedQuestionCache = new AsyncResourceCache<number, RowDataPacket[]>({
  maxEntries: env.QUESTION_CACHE_MAX_EXAMS,
  ttlMs: env.QUESTION_CACHE_TTL_SECONDS * 1_000,
});

export const publicQuestionSql = `
  SELECT id, question_type AS questionType, prompt,
         option_a AS optionA, option_b AS optionB, option_c AS optionC,
         option_d AS optionD, option_e AS optionE, image_url AS imageUrl
  FROM questions
  WHERE exam_id = ? AND status = 'published'
  ORDER BY id ASC`;

export function invalidatePublishedQuestions(examId: number) {
  publishedQuestionCache.invalidate(examId);
  void publishRedis("question-cache:invalidate", String(examId)).catch((error) => {
    console.error(JSON.stringify({
      event: "question_cache_invalidation_publish_failed",
      examId,
      message: error instanceof Error ? error.message : String(error),
    }));
  });
}

export async function initializePublishedQuestionCacheCoordination() {
  return subscribeRedis("question-cache:invalidate", (message) => {
    const examId = Number(message);
    if (!Number.isSafeInteger(examId) || examId <= 0) return;
    publishedQuestionCache.invalidate(examId);
    console.info(JSON.stringify({ event: "question_cache_invalidated", examId }));
  });
}

export async function prewarmPublishedQuestionCache() {
  const [examRows] = await getPool().query<RowDataPacket[]>(
    `SELECT DISTINCT exams.id
     FROM exams
     INNER JOIN questions ON questions.exam_id = exams.id
     WHERE exams.status = 'published' AND questions.status = 'published'
     ORDER BY exams.id ASC`,
  );

  for (const exam of examRows) {
    const examId = Number(exam.id);
    await publishedQuestionCache.get(examId, async () => {
      const [rows] = await getPool().query<RowDataPacket[]>(publicQuestionSql, [examId]);
      return rows;
    });
  }

  return examRows.length;
}
