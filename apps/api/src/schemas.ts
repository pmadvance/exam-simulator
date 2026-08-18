import { z } from "zod";

export const profileGenderSchema = z.enum(["female", "male", "non_binary", "prefer_not_to_say", "other"]);

export const optionalProfileFieldsSchema = {
  age: z.coerce.number().int().min(13).max(120).nullable().optional(),
  occupation: z.string().trim().max(120).nullable().optional(),
  gender: profileGenderSchema.nullable().optional()
};

export const registerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(8),
  ...optionalProfileFieldsSchema,
  verificationCode: z.string().length(6),
  privacyAccepted: z.literal(true)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional().default(false)
});

export const progressSchema = z.object({
  answers: z.record(z.string(), z.string()).default({}),
  markedForReview: z.array(z.string()).default([])
});

export const checkoutSchema = z.object({
  productSlug: z.string().min(3)
});

export const guestCheckoutSchema = z.object({
  productSlug: z.string().min(3),
  productSlugs: z.array(z.string().min(3)).optional(),
  provider: z.enum(["toyyibpay", "stripe", "paypal", "billplz"]).default("toyyibpay"),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  ...optionalProfileFieldsSchema,
  verificationCode: z.string().min(4).max(6),
  voucherCode: z.string().optional(),
  referralCode: z.string().trim().min(4).max(32).optional(),
  privacyAccepted: z.literal(true),
});

export const paymentCallbackSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  status: z.enum(["paid", "failed"]),
  provider: z.string().min(2).default("mockpay"),
  eventKey: z.string().min(8)
});

export const questionImportSchema = z.object({
  examSlug: z.string().min(3),
  csv: z.string().min(20)
});

export const questionImportApplySchema = z.object({
  importId: z.string().uuid()
});

export const questionRollbackSchema = z.object({
  examSlug: z.string().min(3),
  versionNo: z.coerce.number().int().positive()
});

export const sessionPolicyUpdateSchema = z.object({
  userId: z.coerce.number().int().positive(),
  maxSessions: z.coerce.number().int().positive().max(20).nullable().optional(),
  refreshTtlDays: z.coerce.number().int().positive().max(60).nullable().optional()
});

export const productCreateSchema = z.object({
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(2).max(255),
  description: z.string().min(2),
  category: z.string().min(2).max(120),
  difficulty: z.string().min(2).max(40),
  priceUsd: z.coerce.number().min(0),
  accessDays: z.coerce.number().int().positive().default(90),
  visibility: z.enum(["draft", "published", "archived"]).default("draft")
});

export const productUpdateSchema = productCreateSchema.partial().omit({ slug: true });

export const questionCreateSchema = z.object({
  examId: z.coerce.number().int().positive(),
  questionType: z.enum(["single_choice", "multiple_response", "true_false"]).default("single_choice"),
  prompt: z.string().min(5),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().default(""),
  optionD: z.string().default(""),
  optionE: z.string().default(""),
  correctAnswer: z.string().min(1).max(10),
  explanation: z.string().min(1),
  ecoDomain: z.string().max(120).nullable().optional(),
  performanceDomain: z.string().max(120).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  difficulty: z.string().max(20).nullable().optional(),
  status: z.enum(["draft", "published"]).default("published")
});

export const questionUpdateSchema = questionCreateSchema.partial().omit({ examId: true });

export const examCreateSchema = z.object({
  productId: z.coerce.number().int().positive(),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(2).max(255),
  timeLimitMinutes: z.coerce.number().int().positive(),
  passThreshold: z.coerce.number().int().min(0).max(100),
  status: z.enum(["draft", "published"]).default("draft")
});

export const examUpdateSchema = examCreateSchema.partial().omit({ productId: true, slug: true });

export const voucherCreateSchema = z.object({
  code: z.string().min(3).max(60),
  type: z.enum(["fixed", "percentage"]).default("fixed"),
  amount: z.coerce.number().positive(),
  minOrder: z.coerce.number().min(0).default(0),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  productId: z.coerce.number().int().positive().nullable().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().nullable().optional(),
  status: z.enum(["active", "disabled"]).default("active")
});

export const categoryCreateSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(255),
  description: z.string().nullable().optional()
});

export const domainCreateSchema = z.object({
  productId: z.coerce.number().int().positive(),
  name: z.string().min(2).max(120),
  description: z.string().nullable().optional()
});

export const domainUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().nullable().optional()
});

export const enrollmentExtendSchema = z.object({
  days: z.coerce.number().int().positive().max(365),
  reason: z.string().min(2)
});

export const reconcileSchema = z.object({
  status: z.enum(["paid", "failed", "refunded"]),
  reason: z.string().min(2)
});
