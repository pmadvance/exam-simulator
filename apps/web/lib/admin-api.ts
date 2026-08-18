import { apiUrl } from "./api";

export async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const headers: Record<string, string> = {};

    // Forward cookies when running server-side so admin endpoints
    // receive the auth session and don't return 401.
    if (typeof window === "undefined") {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.toString();
        if (cookieHeader) {
          headers["Cookie"] = cookieHeader;
        }
      } catch {
        // next/headers unavailable (e.g. during static generation)
      }
    }

    const response = await fetch(`${apiUrl}${path}`, { 
      cache: "no-store",
      headers,
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch (e) {
    // Return fallback on any error (network, timeout, etc.)
    console.warn(`API fetch failed for ${path}:`, e);
    return fallback;
  }
}

// ───── Admin types ─────

export type DashboardSnapshot = {
  revenueUsd: number;
  activeSubscriptions: number;
  expiringSoon: number;
  failedPayments: number;
  recentAttempts: number;
  totalQuestions?: number;
};

export type AdminAuditLog = {
  id: number;
  actionKey: string;
  entityType: string;
  entityId: string;
  actorEmail: string | null;
  createdAt: string | null;
  payload: unknown;
};

export type AdminSession = {
  id: string;
  userId: number;
  email: string;
  userAgent: string | null;
  ipAddress: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type CsvImportPreview = {
  importId: string;
  examSlug: string;
  summary: {
    incoming: number;
    existing: number;
    skippedRows: number;
    unchanged: number;
    changed: number;
    added: number;
    removed: number;
  };
  sampleIncoming: Array<{
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: "A" | "B" | "C" | "D";
    explanation: string;
  }>;
  diffRows: Array<{
    row: number;
    status: "added" | "removed" | "changed" | "unchanged";
    changedFields: string[];
    existingPrompt: string | null;
    incomingPrompt: string | null;
  }>;
};

export type SessionPolicy = {
  userId: number;
  maxSessions: number | null;
  refreshTtlDays: number | null;
};

export type QuestionVersionSummary = {
  versionNo: number;
  questionCount: number;
  createdAt: string | null;
  importBatchId: string | null;
  createdByEmail: string | null;
};

export type AdminProduct = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  priceUsd: number;
  accessDays: number;
  visibility: "draft" | "published" | "archived";
};

export type AdminQuestion = {
  id: number;
  examId: number;
  examSlug: string;
  questionType: "single_choice" | "multiple_response" | "true_false";
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation: string;
  ecoDomain: string | null;
  performanceDomain: string | null;
  imageUrl: string | null;
  difficulty: string | null;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
};

export type AdminExam = {
  id: number;
  productId: number;
  slug: string;
  title: string;
  timeLimitMinutes: number;
  passThreshold: number;
  questionCount: number;
  status: "draft" | "published";
};

export type AdminUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
  lastRemark?: string | null;
  enrollments?: Array<{
    id: number;
    productSlug: string;
    productTitle: string;
    status: string;
    startsAt?: string | null;
    expiresAt: string | null;
  }>;
};

export type AdminUserDetail = AdminUser & {
  enrollments: Array<{
    id: number;
    productSlug: string;
    productTitle: string;
    status: string;
    startsAt: string;
    expiresAt: string;
  }>;
  orders: Array<{
    id: number;
    productTitle: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
};

export type AdminOrder = {
  id: number;
  userEmail: string;
  productTitle: string;
  status: string;
  totalAmount: number;
  gatewayReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminVoucher = {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  amount: number;
  minOrder: number;
  usageLimit: number | null;
  perUserLimit: number;
  productId: number | null;
  productTitle: string | null;
  validFrom: string;
  validUntil: string | null;
  status: string;
  createdAt: string;
  redemptions: number;
};

export type AdminVoucherPage = {
  data: AdminVoucher[];
  total: number;
  page: number;
  limit: number;
};

export type AdminCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type AdminDomain = {
  id: number;
  productId: number;
  name: string;
  description: string | null;
  createdAt: string;
};

export type AdminAsset = {
  filename: string;
  url: string;
  size: number;
  modified: string;
  inUse: boolean;
};

export type SalesReport = {
  date: string;
  productTitle: string;
  orderCount: number;
  revenue: number;
};

export type EnrollmentReport = {
  productTitle: string;
  productSlug: string;
  totalEnrollments: number;
  activeCount: number;
  expiredCount: number;
};

export type AttemptReport = {
  examTitle: string;
  examSlug: string;
  totalAttempts: number;
  completedAttempts: number;
  avgScore: number | null;
};

export type AdminSettings = {
  supportEmail: string;
  maintenanceMode: boolean;
  maintenancePageType: "maintenance" | "launch";
  maintenanceMessage: string;
  maintenanceAllowedIps: string[];
  maintenanceTeaserLabel: string;
  maintenanceTeaserHeadline: string;
  maintenanceTeaserItems: string[];
  maintenanceCountdownEnabled: boolean;
  maintenanceCountdownEndsAt: string | null;
  announcements: string[];
  payment: {
    toyyibpay: {
      enabled: boolean;
      secretKey: string;
      categoryCode: string;
      sandbox: boolean;
    };
    stripe: {
      enabled: boolean;
      secretKey: string;
      webhookSecret: string;
    };
    paypal: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      sandbox: boolean;
    };
    billplz: {
      enabled: boolean;
      apiKey: string;
      collectionId: string;
      xSignatureKey: string;
      sandbox: boolean;
    };
  };
};

// ───── Admin fetch functions ─────

export function getDashboard() {
  return safeFetch("/api/admin/summary", {
    revenueUsd: 4280,
    activeSubscriptions: 34,
    expiringSoon: 5,
    failedPayments: 2,
    recentAttempts: 0,
    totalQuestions: 0,
  } satisfies DashboardSnapshot);
}

export function getAdminAuditLogs() {
  return safeFetch<AdminAuditLog[]>("/api/admin/audit-logs?limit=30", []);
}

export function getAdminSessions() {
  return safeFetch<AdminSession[]>("/api/admin/sessions", []);
}

export function getQuestionVersions(examSlug: string) {
  return safeFetch<QuestionVersionSummary[]>(
    `/api/admin/questions/versions?examSlug=${encodeURIComponent(examSlug)}`,
    []
  );
}

export function getAdminProducts() {
  return safeFetch<AdminProduct[]>("/api/admin/products", []);
}

export function getAdminQuestions(examId?: number) {
  const qs = examId ? `?examId=${examId}` : "";
  return safeFetch<AdminQuestion[]>(`/api/admin/questions${qs}`, []);
}

export function getAdminExams() {
  return safeFetch<AdminExam[]>("/api/exams", []);
}

export function getAdminUsers() {
  return safeFetch<AdminUser[]>("/api/admin/users", []);
}

export function getAdminOrders() {
  return safeFetch<AdminOrder[]>("/api/admin/orders", []);
}

export function getAdminVouchers(params?: { page?: number; limit?: number; search?: string; status?: string; type?: string; productId?: number }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  if (params?.productId) qs.set("productId", String(params.productId));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return safeFetch<AdminVoucherPage>(`/api/admin/vouchers${query}`, { data: [], total: 0, page: 1, limit: 25 });
}

export function getAdminCategories() {
  return safeFetch<AdminCategory[]>("/api/admin/categories", []);
}

export function getSalesReport(days = 30) {
  return safeFetch<SalesReport[]>(`/api/admin/reports/sales?days=${days}`, []);
}

export function getEnrollmentReport() {
  return safeFetch<EnrollmentReport[]>("/api/admin/reports/enrollments", []);
}

export function getAttemptReport() {
  return safeFetch<AttemptReport[]>("/api/admin/reports/attempts", []);
}

export function getAdminSettings() {
  return safeFetch<AdminSettings>("/api/admin/settings", {
    supportEmail: "inquiry@pmadvance.com.my",
    maintenanceMode: false,
    maintenancePageType: "maintenance",
    maintenanceMessage: "",
    maintenanceAllowedIps: [],
    maintenanceTeaserLabel: "Launching Soon",
    maintenanceTeaserHeadline: "PM Exam Pro launches soon.",
    maintenanceTeaserItems: [
      "Exam-style practice|Train with timed simulators built around certification exam workflows.",
      "Progress insights|Spot weak domains and know where to focus before exam day.",
      "Simple access|Choose a practice set, checkout, and start studying without friction.",
    ],
    maintenanceCountdownEnabled: false,
    maintenanceCountdownEndsAt: null,
    announcements: [],
    payment: {
      toyyibpay: {
        enabled: false,
        secretKey: "",
        categoryCode: "",
        sandbox: true,
      },
      stripe: {
        enabled: false,
        secretKey: "",
        webhookSecret: "",
      },
      paypal: {
        enabled: false,
        clientId: "",
        clientSecret: "",
        sandbox: true,
      },
      billplz: {
        enabled: false,
        apiKey: "",
        collectionId: "",
        xSignatureKey: "",
        sandbox: true,
      },
    },
  });
}

export function getAdminEcoDomains() {
  return safeFetch<AdminDomain[]>("/api/admin/eco-domains", []);
}

export function getAdminPerfDomains() {
  return safeFetch<AdminDomain[]>("/api/admin/performance-domains", []);
}

export type ReferralSummary = {
  totalCodes: number;
  totalRedemptions: number;
  totalRewardMyr: number;
  pending: number;
};

export type ReferralCode = {
  id: number;
  code: string;
  userEmail: string;
  userFullName: string;
  totalRedemptions: number;
  totalRewardMyr: number;
  createdAt: string;
};

export type ReferralRedemption = {
  id: number;
  status: string;
  createdAt: string;
  rewardedAt: string | null;
  orderId: number | null;
  referrerEmail: string;
  refereeEmail: string;
};

export type ReferralData = {
  summary: ReferralSummary;
  codes: ReferralCode[];
  redemptions: ReferralRedemption[];
};

export type AdminOrganization = {
  id: number;
  slug: string;
  name: string;
  contactEmail: string | null;
  status: string;
  memberCount: number;
  orderCount: number;
  seatTierOverride: number | null;
};

export function getAdminOrganizations() {
  return safeFetch<AdminOrganization[]>("/api/admin/organizations", []);
}

export function getAdminReferrals() {
  return safeFetch<ReferralData>("/api/admin/referrals", {
    summary: { totalCodes: 0, totalRedemptions: 0, totalRewardMyr: 0, pending: 0 },
    codes: [],
    redemptions: [],
  });
}
