import type { RowDataPacket } from "mysql2";

export type AttemptRecord = {
  id: string;
  examSlug: string;
  startedAt: string;
  answers: Record<string, string>;
  markedForReview: string[];
  trainingMode: boolean;
  status: string;
  submittedAt?: string | null;
};

export type ProductSummaryRow = RowDataPacket & {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  priceUsd: number | string;
  accessDays: number;
};

export type ExamRow = RowDataPacket & {
  id: number;
  productId: number;
  slug: string;
  title: string;
  timeLimitMinutes: number;
  passThreshold: number;
  questionCount: number;
  status: string;
  productSlug?: string;
};

export type QuestionPreviewRow = RowDataPacket & {
  id: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  explanation: string;
};

export type AttemptRow = RowDataPacket & {
  id: string;
  examSlug: string;
  startedAt: Date | string;
  answersJson: string;
  markedForReviewJson: string;
  trainingMode: number;
  status: string;
  submittedAt: Date | string | null;
};

export type ParsedQuestionCsv = {
  records: Array<{
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE: string;
    correctAnswer: string;
    explanation: string;
    questionType: "single_choice" | "multiple_response" | "true_false";
    ecoDomain: string | null;
    performanceDomain: string | null;
    imageUrl: string | null;
    status: "draft" | "published";
    difficulty: string | null;
  }>;
  skippedRows: number;
  skipReasons: Array<{ row: number; reason: string }>;
};

export type SessionPolicy = {
  maxSessions: number | null;
  refreshTtlDays: number | null;
};
