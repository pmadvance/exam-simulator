export const sampleProducts = [
  {
    id: 1,
    slug: "pmp-exam-prep",
    title: "PMP® Exam Preparation Practice Pack",
    description: "Comprehensive practice exams aligned to the latest PMP Examination Content Outline (ECO). Covers People, Process, and Business Environment domains with situational, scenario-based questions.",
    category: "Professional Certification",
    difficulty: "Advanced",
    priceUsd: 299,
    accessDays: 90
  },
  {
    id: 2,
    slug: "capm-exam-prep",
    title: "CAPM® Exam Preparation Practice Pack",
    description: "Practice exams for CAPM® certification covering predictive, agile, and hybrid approaches based on PMBOK® Guide 7th Edition.",
    category: "Professional Certification",
    difficulty: "Intermediate",
    priceUsd: 199,
    accessDays: 90
  },
  {
    id: 3,
    slug: "pmi-rmp-exam-prep",
    title: "PMI-RMP® Risk Management Practice Pack",
    description: "Targeted practice exams for PMI-RMP® certification covering risk strategy, monitoring, and quantitative analysis.",
    category: "Professional Certification",
    difficulty: "Advanced",
    priceUsd: 249,
    accessDays: 90
  },
  {
    id: 4,
    slug: "pmi-acp-exam-prep",
    title: "PMI-ACP® Agile Practice Pack",
    description: "Agile-focused practice exams covering Scrum, Kanban, Lean, XP, and hybrid frameworks for PMI-ACP® certification.",
    category: "Professional Certification",
    difficulty: "Advanced",
    priceUsd: 249,
    accessDays: 90
  },
  {
    id: 5,
    slug: "pm-essentials",
    title: "Project Management Essentials Practice Pack",
    description: "Foundational practice questions covering the complete project management lifecycle based on PMI methodology.",
    category: "Public Training",
    difficulty: "Beginner",
    priceUsd: 99,
    accessDays: 60
  },
  {
    id: 6,
    slug: "project-risk-management",
    title: "Project Risk Management Practice Pack",
    description: "Practice questions on risk identification, analysis, response planning, and monitoring based on PMI standards.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 99,
    accessDays: 60
  },
  {
    id: 7,
    slug: "excel-basic",
    title: "Microsoft Excel (Basic) Practice Pack",
    description: "Practice exercises covering Excel fundamentals — formatting, basic formulas, sorting, filtering, and charts.",
    category: "Public Training",
    difficulty: "Beginner",
    priceUsd: 49,
    accessDays: 30
  },
  {
    id: 8,
    slug: "excel-intermediate",
    title: "Microsoft Excel (Intermediate) Practice Pack",
    description: "Intermediate-level practice covering VLOOKUP, INDEX-MATCH, PivotTables, and multi-sheet workbook management.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 49,
    accessDays: 30
  },
  {
    id: 9,
    slug: "excel-advanced",
    title: "Microsoft Excel (Advanced) Practice Pack",
    description: "Advanced practice covering Power Query, Power Pivot, dynamic arrays, macros, and dashboard creation.",
    category: "Public Training",
    difficulty: "Advanced",
    priceUsd: 69,
    accessDays: 30
  },
  {
    id: 10,
    slug: "strategic-pm-executives",
    title: "Strategic PM for Senior Executives Practice Pack",
    description: "Executive-level scenarios covering strategic alignment, portfolio governance, and benefits realisation.",
    category: "In-House Training",
    difficulty: "Advanced",
    priceUsd: 199,
    accessDays: 60
  },
  {
    id: 11,
    slug: "ms-project-scheduling",
    title: "MS Project Professional Scheduling Practice Pack",
    description: "Practice on Microsoft Project — WBS, task dependencies, resource assignment, baseline tracking, and critical path.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 99,
    accessDays: 60
  },
  {
    id: 12,
    slug: "digital-pm-ai",
    title: "Digital Project Management Using AI Practice Pack",
    description: "Practice scenarios exploring AI-powered scheduling, risk prediction, and resource optimisation in PM.",
    category: "Public Training",
    difficulty: "Intermediate",
    priceUsd: 99,
    accessDays: 60
  },
  {
    id: 13,
    slug: "advanced-scheduling-jkr",
    title: "Advanced Scheduling Mastery: MS Project for JKR Compliance",
    description: "Specialised practice for government scheduling with JKR compliance — S-curve, EVM, and progress claims.",
    category: "Public Training",
    difficulty: "Advanced",
    priceUsd: 129,
    accessDays: 60
  }
] as const;

export const sampleExams = [
  { id: 1, productId: 1, slug: "pmp-mock-01", title: "PMP® Mock Exam 01", timeLimitMinutes: 230, passThreshold: 70, questionCount: 180, status: "published" },
  { id: 2, productId: 2, slug: "capm-mock-01", title: "CAPM® Mock Exam 01", timeLimitMinutes: 180, passThreshold: 65, questionCount: 150, status: "published" },
  { id: 3, productId: 3, slug: "rmp-mock-01", title: "PMI-RMP® Mock Exam 01", timeLimitMinutes: 150, passThreshold: 70, questionCount: 115, status: "published" },
  { id: 4, productId: 4, slug: "acp-mock-01", title: "PMI-ACP® Mock Exam 01", timeLimitMinutes: 180, passThreshold: 70, questionCount: 120, status: "published" },
  { id: 5, productId: 5, slug: "pm-essentials-01", title: "PM Essentials Quiz 01", timeLimitMinutes: 60, passThreshold: 60, questionCount: 40, status: "published" },
  { id: 6, productId: 6, slug: "risk-mgmt-01", title: "Project Risk Management Quiz 01", timeLimitMinutes: 60, passThreshold: 60, questionCount: 40, status: "published" },
  { id: 7, productId: 7, slug: "excel-basic-01", title: "Excel Basic Quiz 01", timeLimitMinutes: 30, passThreshold: 60, questionCount: 30, status: "published" },
  { id: 8, productId: 8, slug: "excel-intermediate-01", title: "Excel Intermediate Quiz 01", timeLimitMinutes: 45, passThreshold: 60, questionCount: 30, status: "published" },
  { id: 9, productId: 9, slug: "excel-advanced-01", title: "Excel Advanced Quiz 01", timeLimitMinutes: 45, passThreshold: 60, questionCount: 30, status: "published" },
  { id: 10, productId: 10, slug: "strategic-pm-01", title: "Strategic PM for Executives Quiz 01", timeLimitMinutes: 90, passThreshold: 65, questionCount: 50, status: "published" },
  { id: 11, productId: 11, slug: "ms-project-01", title: "MS Project Scheduling Quiz 01", timeLimitMinutes: 60, passThreshold: 60, questionCount: 40, status: "published" },
  { id: 12, productId: 12, slug: "digital-pm-ai-01", title: "Digital PM Using AI Quiz 01", timeLimitMinutes: 60, passThreshold: 60, questionCount: 40, status: "published" },
  { id: 13, productId: 13, slug: "jkr-scheduling-01", title: "Advanced Scheduling (JKR) Quiz 01", timeLimitMinutes: 60, passThreshold: 60, questionCount: 40, status: "published" }
] as const;

export const sampleQuestions = [
  {
    id: 1,
    examId: 1,
    prompt: "A sponsor asks for a compressed delivery timeline after scope has already been baselined. What should the project manager do first?",
    options: {
      A: "Update the schedule immediately to show support for the sponsor.",
      B: "Assess impact through integrated change control before committing.",
      C: "Ask the team to work overtime while deferring documentation.",
      D: "Remove lower-priority requirements without stakeholder review."
    },
    correctAnswer: "B",
    explanation: "Schedule compression changes affect scope, risk, and cost. The request should enter formal change control before commitment."
  }
] as const;
