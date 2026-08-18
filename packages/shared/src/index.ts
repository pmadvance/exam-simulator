import { z } from "zod";

export const productSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  difficulty: z.string(),
  priceUsd: z.number(),
  accessDays: z.number()
});

export const examSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  timeLimitMinutes: z.number(),
  passThreshold: z.number(),
  questionCount: z.number()
});

export const dashboardSnapshotSchema = z.object({
  revenueUsd: z.number(),
  activeSubscriptions: z.number(),
  expiringSoon: z.number(),
  failedPayments: z.number(),
  recentAttempts: z.number()
});

export type ProductSummary = z.infer<typeof productSummarySchema>;
export type ExamSummary = z.infer<typeof examSummarySchema>;
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
