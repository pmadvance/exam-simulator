export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Read the `ref` cookie set by RefCookieCapture (from `?ref=CODE` URL param).
 * Returns the upper-cased code, or null if not set / running on the server.
 * Used to forward referral attribution into checkout/signup payloads
 * (since the API runs on a different origin and cannot read the web's cookies).
 */
export function getRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)ref=([^;]+)/);
  if (!match) return null;
  const code = decodeURIComponent(match[1]).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length >= 4 ? code : null;
}

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export type ProductCard = {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  priceUsd: number;
  accessDays: number;
};

export type TrialQuestion = {
  id?: number;
  prompt: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  imageUrl?: string | null;
};

export type ExamDetail = {
  id?: number;
  slug: string;
  title: string;
  timeLimitMinutes: number;
  passThreshold: number;
  questionCount: number;
  productSlug?: string;
  previewQuestion?: {
    id?: number;
    prompt: string;
    options: Record<string, string>;
    explanation: string;
  };
  trialQuestions?: TrialQuestion[];
};

export type ProductDetail = ProductCard & {
  id: number;
  exams: Array<{
    id: number;
    productId: number;
    slug: string;
    title: string;
    timeLimitMinutes: number;
    passThreshold: number;
    questionCount: number;
    status?: string;
  }>;
};

export type LoginResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
};

export type OrderResponse = {
  orderId: number;
  status: string;
  gatewayReference: string;
  product: ProductCard & { id: number };
  callbackPayload: {
    orderId: number;
    status: "paid" | "failed";
    provider: string;
    eventKey: string;
  };
};

export type EnrollmentSummary = {
  id: number;
  productSlug: string;
  productTitle: string;
  status: string;
  startsAt: string;
  expiresAt: string;
};

export type AttemptState = {
  id: string;
  examSlug: string;
  startedAt: string;
  answers: Record<string, string>;
  markedForReview: string[];
  trainingMode?: boolean;
  status: "in_progress" | "submitted";
  submittedAt?: string | null;
  // Optional fields for in-progress attempts
  timeLimitMinutes?: number;
  questionCount?: number;
  answeredCount?: number;
  remainingMinutes?: number;
};

export type AttemptResult = {
  attemptId: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
};

export type AttemptResultDetail = {
  attemptId: number;
  examSlug: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  passThreshold: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  questions: Array<{
    id: number;
    questionType: "single_choice" | "multiple_response" | "true_false";
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE?: string;
    correctAnswer: string;
    explanation: string;
    selectedAnswer: string | null;
    isCorrect: boolean;
  }>;
};

export type ExamGoal = {
  examDate: string;
  certificationLabel: string | null;
  updatedAt?: string;
};

export type AttemptHistoryItem = {
  id: number;
  examSlug: string;
  examTitle: string;
  status: string;
  score: number | null;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string | null;
};

export type StudentOrder = {
  id: number;
  productTitle: string;
  status: string;
  totalAmount: number;
  gatewayReference: string | null;
  createdAt: string;
};

export type OrderReceipt = {
  receiptNumber: string;
  orderId: number;
  status: string;
  totalAmount: number;
  currency: string;
  gatewayProvider: string | null;
  gatewayReference: string | null;
  productTitle: string;
  productDescription: string;
  accessDays: number;
  customerName: string;
  customerEmail: string;
  paidAt: string;
  createdAt: string;
};

export type VoucherApplyResult = {
  voucherId: number;
  code: string;
  discount: number;
  finalPrice: number;
};

export type CheckoutResult = {
  orderId: number;
  paymentUrl: string;
  billCode: string;
  provider: string;
};

export type PaymentGatewayAvailability = Record<
  "toyyibpay" | "stripe" | "paypal" | "billplz",
  { enabled: boolean; configured: boolean }
>;

export type OrderStatus = {
  id: number;
  status: string;
  totalAmount: number;
  productTitle: string;
  productSlug: string;
};

const fallbackProducts: ProductCard[] = [
  {
    slug: "pmp-exam-prep",
    title: "PMP® Exam Preparation Practice Pack",
    description: "Comprehensive practice exams aligned to the latest PMP ECO. Covers People, Process, and Business Environment domains.",
    category: "Professional Certification",
    difficulty: "Advanced",
    priceUsd: 299,
    accessDays: 90
  },
  {
    slug: "capm-exam-prep",
    title: "CAPM® Exam Preparation Practice Pack",
    description: "Practice exams for CAPM® certification covering predictive, agile, and hybrid approaches based on PMBOK® Guide 7th Edition.",
    category: "Professional Certification",
    difficulty: "Intermediate",
    priceUsd: 199,
    accessDays: 90
  },
  {
    slug: "pmi-rmp-exam-prep",
    title: "PMI-RMP® Risk Management Practice Pack",
    description: "Targeted practice exams for PMI-RMP® certification covering risk strategy, monitoring, and quantitative analysis.",
    category: "Professional Certification",
    difficulty: "Advanced",
    priceUsd: 249,
    accessDays: 90
  },
  {
    slug: "pmi-acp-exam-prep",
    title: "PMI-ACP® Agile Practice Pack",
    description: "Agile-focused practice exams covering Scrum, Kanban, Lean, XP, and hybrid frameworks for PMI-ACP® certification.",
    category: "Professional Certification",
    difficulty: "Advanced",
    priceUsd: 249,
    accessDays: 90
  },
  {
    slug: "pm-essentials",
    title: "Project Management Essentials Practice Pack",
    description: "Foundational practice questions covering the complete project management lifecycle based on PMI methodology.",
    category: "Public Training",
    difficulty: "Beginner",
    priceUsd: 99,
    accessDays: 60
  },
  {
    slug: "project-risk-management",
    title: "Project Risk Management Practice Pack",
    description: "Practice questions on risk identification, analysis, response planning, and monitoring based on PMI standards.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 99,
    accessDays: 60
  },
  {
    slug: "excel-basic",
    title: "Microsoft Excel (Basic) Practice Pack",
    description: "Practice exercises covering Excel fundamentals — formatting, basic formulas, sorting, filtering, and charts.",
    category: "Public Training",
    difficulty: "Beginner",
    priceUsd: 49,
    accessDays: 30
  },
  {
    slug: "excel-intermediate",
    title: "Microsoft Excel (Intermediate) Practice Pack",
    description: "Intermediate-level practice covering VLOOKUP, INDEX-MATCH, PivotTables, and multi-sheet workbook management.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 49,
    accessDays: 30
  },
  {
    slug: "excel-advanced",
    title: "Microsoft Excel (Advanced) Practice Pack",
    description: "Advanced practice covering Power Query, Power Pivot, dynamic arrays, macros, and dashboard creation.",
    category: "Public Training",
    difficulty: "Advanced",
    priceUsd: 69,
    accessDays: 30
  },
  {
    slug: "strategic-pm-executives",
    title: "Strategic PM for Senior Executives Practice Pack",
    description: "Executive-level scenarios covering strategic alignment, portfolio governance, and benefits realisation.",
    category: "In-House Training",
    difficulty: "Advanced",
    priceUsd: 199,
    accessDays: 60
  },
  {
    slug: "ms-project-scheduling",
    title: "MS Project Professional Scheduling Practice Pack",
    description: "Practice on Microsoft Project — WBS, task dependencies, resource assignment, baseline tracking, and critical path.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 99,
    accessDays: 60
  },
  {
    slug: "digital-pm-ai",
    title: "Digital Project Management Using AI Practice Pack",
    description: "Practice scenarios exploring AI-powered scheduling, risk prediction, and resource optimisation in PM.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 99,
    accessDays: 60
  },
  {
    slug: "advanced-scheduling-jkr",
    title: "Advanced Scheduling Mastery: MS Project for JKR Compliance",
    description: "Specialised practice for government scheduling with JKR compliance — S-curve, EVM, and progress claims.",
    category: "Public Training",
    difficulty: "Advanced",
    priceUsd: 129,
    accessDays: 60
  }
];

export function getProducts() {
  return safeFetch("/api/products", fallbackProducts);
}

export function getExam(slug: string) {
  return safeFetch<ExamDetail>(`/api/exams/${slug}`, {
    slug,
    title: "Exam unavailable",
    timeLimitMinutes: 180,
    passThreshold: 70,
    questionCount: 180
  });
}

export function getProduct(slug: string) {
  return safeFetch<ProductDetail | null>(`/api/products/${slug}`, null);
}

// Mutex to prevent concurrent refresh requests from racing and
// invalidating each other's tokens during token rotation.
let refreshPromise: Promise<boolean> | null = null;

/** In the browser, use relative URLs so requests go through Next.js rewrites (same-origin). */
const browserBaseUrl = typeof window !== "undefined" ? "" : apiUrl;

function refreshAuth(): Promise<boolean> {
  if (refreshPromise) {
    console.log("[RefreshAuth] Refresh already in progress, waiting...");
    return refreshPromise;
  }
  refreshPromise = (async () => {
    try {
      console.log("[RefreshAuth] Calling /api/auth/refresh...");
      const res = await fetch(`${browserBaseUrl}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      console.log(`[RefreshAuth] Result: ${res.status} ${res.ok ? "OK" : "FAILED"}`);
      return res.ok;
    } catch (err) {
      console.log("[RefreshAuth] Error:", err);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function shouldRedirectAfterAuthFailure(path: string) {
  if (typeof window === "undefined") return false;

  const currentPath = window.location.pathname;
  if (currentPath.startsWith("/admin") || currentPath.startsWith("/me")) return true;

  const protectedApiPrefixes = [
    "/api/attempts",
    "/api/exam-goal",
    "/api/performance",
    "/api/pdpa-requests",
    "/api/referral",
  ];

  if (protectedApiPrefixes.some((prefix) => path.startsWith(prefix))) return true;

  if (path.startsWith("/api/exams/") && (path.endsWith("/attempts") || path.endsWith("/in-progress"))) {
    return true;
  }

  return false;
}

function redirectToLoginAfterAuthFailure() {
  if (typeof window === "undefined") return;

  const currentPath = window.location.pathname + window.location.search;
  if (window.location.pathname.startsWith("/admin")) {
    if (window.location.pathname !== "/admin/login") {
      window.location.replace("/admin/login");
    }
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.replace(`/login?next=${encodeURIComponent(currentPath)}`);
  }
}

export async function browserApiFetch<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  async function executeRequest() {
    return fetch(`${browserBaseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      }
    });
  }

  let response: Response;
  try {
    response = await executeRequest();
  } catch (err) {
    throw new Error(
      err instanceof TypeError
        ? "Cannot reach the API server. Please check your connection."
        : (err instanceof Error ? err.message : "Network request failed")
    );
  }

  if (response.status === 401 && path !== "/api/auth/refresh") {
    console.log(`[API] Got 401 on ${path}, attempting refresh...`);
    const refreshed = await refreshAuth();
    if (refreshed) {
      console.log(`[API] Refresh succeeded, retrying ${path}`);
      try {
        response = await executeRequest();
      } catch (err) {
        throw new Error(
          err instanceof TypeError
            ? "Cannot reach the API server. Please check your connection."
            : (err instanceof Error ? err.message : "Network request failed")
        );
      }
    } else if (shouldRedirectAfterAuthFailure(path)) {
      console.log(`[API] Refresh failed, redirecting to login`);
      redirectToLoginAfterAuthFailure();
      throw new Error("Session expired. Redirecting to login...");
    }
  }

  if (response.status === 401 && shouldRedirectAfterAuthFailure(path)) {
    redirectToLoginAfterAuthFailure();
    throw new Error("Session expired. Redirecting to login...");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string; issues?: { fieldErrors?: Record<string, string[]> } } | null;
    if (payload?.message === "Validation failed" && payload.issues?.fieldErrors) {
      const details = Object.entries(payload.issues.fieldErrors)
        .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
        .join("; ");
      throw new Error(`Validation failed — ${details}`);
    }
    throw new Error(payload?.message ?? `Request failed with ${response.status}`);
  }

  // Handle 204 No Content responses (e.g., DELETE requests)
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await response.json()) as T;
}
