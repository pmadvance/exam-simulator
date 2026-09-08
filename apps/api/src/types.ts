import type { RowDataPacket } from "mysql2";

export type AttemptRecord = {
  id: string;
  examSlug: string;
  startedAt: string;
  answers: Record<string, string>;
  markedForReview: string[];
  questionTimings: Record<string, number>;
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
  examType?: "quiz" | "section" | "full_simulation";
  questionCount: number;
  status: string;
  productSlug?: string;
};

export type QuestionPreviewRow = RowDataPacket & {
  id: number;
  questionType: "single_choice" | "multiple_response" | "true_false";
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  explanation: string;
  correctAnswer: string;
};

export type AttemptRow = RowDataPacket & {
  id: string;
  examSlug: string;
  startedAt: Date | string;
  answersJson: string;
  markedForReviewJson: string;
  questionTimingsJson?: string | null;
  questionsSnapshotJson?: string | null;
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
