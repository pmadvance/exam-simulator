import bcrypt from "bcryptjs";

import { ensureDatabaseTables, getPool } from "../db.js";

async function run() {
  await ensureDatabaseTables();

  const passwordHash = await bcrypt.hash("demo12345", 10);
  const adminPasswordHash = await bcrypt.hash("admin12345", 10);

  // ── Users ──
  await getPool().execute(
    `INSERT INTO users (email, full_name, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role), status = 'active'`,
    ["student@example.com", "Demo Student", passwordHash, "student"]
  );

  await getPool().execute(
    `INSERT INTO users (email, full_name, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role), status = 'active'`,
    ["expired@example.com", "Expired Demo Student", passwordHash, "student"]
  );

  await getPool().execute(
    `INSERT INTO users (email, full_name, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role)`,
    ["admin@example.com", "Demo Admin", adminPasswordHash, "admin"]
  );

  // ── Products (13 PM Advance training practice-exam packs) ──
  await getPool().execute(
    `INSERT INTO products (slug, title, description, category, difficulty, price_usd, access_days, visibility)
     VALUES
       ('pmp-exam-prep',
        'PMP® Exam Preparation Practice Pack',
        'Comprehensive practice exams aligned to the latest PMP Examination Content Outline (ECO). Covers People, Process, and Business Environment domains with situational, scenario-based questions. Ideal for participants of PM Advance''s 5-day PMP® Exam Preparation Training (35 PDUs). Includes 1,000-question bank, timed simulations, and detailed answer explanations.',
        'Professional Certification', 'Advanced', 299, 90, 'published'),

       ('capm-exam-prep',
        'CAPM® Exam Preparation Practice Pack',
        'Practice exams designed for the Certified Associate in Project Management (CAPM®) certification. Covers predictive, agile, and hybrid project management approaches based on the PMBOK® Guide 7th Edition. Perfect companion to PM Advance''s 3-day CAPM® Training (23 contact hours). Features scenario-based questions with full explanations.',
        'Professional Certification', 'Intermediate', 199, 90, 'published'),

       ('pmi-rmp-exam-prep',
        'PMI-RMP® Risk Management Practice Pack',
        'Targeted practice exams for the PMI Risk Management Professional (PMI-RMP®) certification. Covers risk strategy, stakeholder engagement, risk process facilitation, risk monitoring, and advanced quantitative/qualitative analysis. Aligned with PM Advance''s 4-day PMI-RMP® Certification Training curriculum.',
        'Professional Certification', 'Advanced', 249, 90, 'published'),

       ('pmi-acp-exam-prep',
        'PMI-ACP® Agile Practice Pack',
        'Agile-focused practice exams for the PMI Agile Certified Practitioner (PMI-ACP®) certification. Covers Scrum, Kanban, Lean, XP, and hybrid frameworks. Questions address agile principles, value-driven delivery, stakeholder engagement, team performance, and adaptive planning. Complements PM Advance''s 4-day PMI-ACP® Training (28 contact hours).',
        'Professional Certification', 'Advanced', 249, 90, 'published'),

       ('pm-essentials',
        'Project Management Essentials Practice Pack',
        'Foundational practice questions covering the complete project management lifecycle — initiating, planning, executing, monitoring & controlling, and closing. Based on globally recognised PMI methodology. Ideal for new project managers or those seeking structured PM knowledge without pursuing certification.',
        'Public Training', 'Beginner', 99, 60, 'published'),

       ('project-risk-management',
        'Project Risk Management Practice Pack',
        'Practice questions focused on project risk management processes — risk identification, qualitative and quantitative analysis, risk response planning, and risk monitoring. Based on PMI''s Standard for Risk Management in Portfolios, Programs, and Projects. Suitable for project managers wanting to strengthen risk competency.',
        'Public Training', 'Intermediate', 99, 60, 'published'),

       ('excel-basic',
        'Microsoft Excel (Basic) Practice Pack',
        'Practice exercises and quiz questions covering Excel fundamentals — cell formatting, basic formulas (SUM, AVERAGE, COUNT, IF), sorting, filtering, charts, and print setup. Designed for beginners aiming to build productivity skills in spreadsheet management.',
        'Public Training', 'Beginner', 49, 30, 'published'),

       ('excel-intermediate',
        'Microsoft Excel (Intermediate) Practice Pack',
        'Intermediate-level practice covering advanced formulas (VLOOKUP, HLOOKUP, INDEX-MATCH, nested IF), conditional formatting, data validation, PivotTables, and multi-sheet workbook management. For professionals who want to go beyond basics.',
        'Public Training', 'Intermediate', 49, 30, 'published'),

       ('excel-advanced',
        'Microsoft Excel (Advanced) Practice Pack',
        'Advanced practice pack covering Power Query, Power Pivot, advanced PivotTables, dynamic arrays (XLOOKUP, FILTER, SORT, UNIQUE), macro basics, and dashboard creation. Designed for power users and analysts managing complex datasets.',
        'Public Training', 'Advanced', 69, 30, 'published'),

       ('strategic-pm-executives',
        'Strategic Project Management for Senior Executives Practice Pack',
        'Executive-level practice scenarios covering strategic project alignment, portfolio governance, benefits realisation, organisational change management, and PMO frameworks. Designed for C-suite leaders and senior decision-makers overseeing project portfolios.',
        'In-House Training', 'Advanced', 199, 60, 'published'),

       ('ms-project-scheduling',
        'Microsoft Project Professional Scheduling Practice Pack',
        'Practice questions and exercises on Microsoft Project — WBS creation, task dependencies, resource assignment, baseline tracking, critical path analysis, and progress reporting. Covers both predictive scheduling and hybrid approaches.',
        'Public Training', 'Intermediate', 99, 60, 'published'),

       ('digital-pm-ai',
        'Digital Project Management Using AI Practice Pack',
        'Practice scenarios exploring AI-powered project management — leveraging AI for scheduling, risk prediction, resource optimisation, stakeholder communication, and decision support. Covers practical integration of AI tools into the PM lifecycle.',
        'Public Training', 'Intermediate', 99, 60, 'published'),

       ('advanced-scheduling-jkr',
        'Advanced Scheduling Mastery: MS Project for JKR Compliance',
        'Specialised practice pack for government project scheduling using Microsoft Project with JKR (Jabatan Kerja Raya) compliance requirements. Covers S-curve reporting, earned value management, progress claim preparation, and scheduling standards mandated for Malaysian public works projects.',
        'Public Training', 'Advanced', 129, 60, 'published')

     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
       category = VALUES(category), difficulty = VALUES(difficulty),
       price_usd = VALUES(price_usd), access_days = VALUES(access_days), visibility = VALUES(visibility)`
  );

  await getPool().execute(
    `INSERT INTO vouchers (code, type, amount, min_order, usage_limit, per_user_limit, valid_from, valid_until, status)
     VALUES
       ('SAVE10', 'percentage', 10.00, 0.00, 1000, 100, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY), DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 YEAR), 'active'),
      ('EXPIRED10', 'percentage', 10.00, 0.00, 1000, 100, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 YEAR), DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 YEAR), 'active')
     ON DUPLICATE KEY UPDATE type = VALUES(type), amount = VALUES(amount), min_order = VALUES(min_order),
       usage_limit = VALUES(usage_limit), per_user_limit = VALUES(per_user_limit), valid_from = VALUES(valid_from),
       valid_until = VALUES(valid_until), status = VALUES(status)`
  );

  await getPool().execute(
    `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
     SELECT users.id, products.id, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL products.access_days DAY), 'active'
     FROM users
     INNER JOIN products ON products.slug = 'pmp-exam-prep'
     WHERE users.email = 'student@example.com'
       AND NOT EXISTS (
         SELECT 1 FROM enrollments e
         WHERE e.user_id = users.id
           AND e.product_id = products.id
           AND e.status = 'active'
           AND e.expires_at > CURRENT_TIMESTAMP
       )`
  );

  await getPool().execute(
    `UPDATE enrollments
     INNER JOIN users ON users.id = enrollments.user_id
     INNER JOIN products ON products.id = enrollments.product_id
     SET enrollments.starts_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 120 DAY),
         enrollments.expires_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY),
         enrollments.status = 'expired'
     WHERE users.email = 'expired@example.com'
       AND products.slug = 'pmp-exam-prep'`
  );

  await getPool().execute(
    `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
     SELECT users.id, products.id, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 120 DAY), DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY), 'expired'
     FROM users
     INNER JOIN products ON products.slug = 'pmp-exam-prep'
     WHERE users.email = 'expired@example.com'
       AND NOT EXISTS (
         SELECT 1 FROM enrollments e
         WHERE e.user_id = users.id
           AND e.product_id = products.id
       )`
  );

  await getPool().execute(
    `INSERT INTO user_session_policies (user_id, max_sessions, refresh_ttl_days)
     SELECT id, 3, 14 FROM users WHERE email = 'student@example.com'
     ON DUPLICATE KEY UPDATE max_sessions = VALUES(max_sessions), refresh_ttl_days = VALUES(refresh_ttl_days)`
  );

  // ── Exams (one starter exam per product) ──
  const examDefs: { productSlug: string; examSlug: string; title: string; minutes: number; pass: number }[] = [
    { productSlug: "pmp-exam-prep", examSlug: "pmp-mock-01", title: "PMP® Mock Exam 01", minutes: 230, pass: 70 },
    { productSlug: "capm-exam-prep", examSlug: "capm-mock-01", title: "CAPM® Mock Exam 01", minutes: 180, pass: 65 },
    { productSlug: "pmi-rmp-exam-prep", examSlug: "rmp-mock-01", title: "PMI-RMP® Mock Exam 01", minutes: 150, pass: 70 },
    { productSlug: "pmi-acp-exam-prep", examSlug: "acp-mock-01", title: "PMI-ACP® Mock Exam 01", minutes: 180, pass: 70 },
    { productSlug: "pm-essentials", examSlug: "pm-essentials-01", title: "PM Essentials Quiz 01", minutes: 60, pass: 60 },
    { productSlug: "project-risk-management", examSlug: "risk-mgmt-01", title: "Project Risk Management Quiz 01", minutes: 60, pass: 60 },
    { productSlug: "excel-basic", examSlug: "excel-basic-01", title: "Excel Basic Quiz 01", minutes: 30, pass: 60 },
    { productSlug: "excel-intermediate", examSlug: "excel-intermediate-01", title: "Excel Intermediate Quiz 01", minutes: 45, pass: 60 },
    { productSlug: "excel-advanced", examSlug: "excel-advanced-01", title: "Excel Advanced Quiz 01", minutes: 45, pass: 60 },
    { productSlug: "strategic-pm-executives", examSlug: "strategic-pm-01", title: "Strategic PM for Executives Quiz 01", minutes: 90, pass: 65 },
    { productSlug: "ms-project-scheduling", examSlug: "ms-project-01", title: "MS Project Scheduling Quiz 01", minutes: 60, pass: 60 },
    { productSlug: "digital-pm-ai", examSlug: "digital-pm-ai-01", title: "Digital PM Using AI Quiz 01", minutes: 60, pass: 60 },
    { productSlug: "advanced-scheduling-jkr", examSlug: "jkr-scheduling-01", title: "Advanced Scheduling (JKR) Quiz 01", minutes: 60, pass: 60 },
  ];

  for (const e of examDefs) {
    await getPool().execute(
      `INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
       SELECT id, ?, ?, ?, ?, 'published'
       FROM products WHERE slug = ?
       ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes),
         pass_threshold = VALUES(pass_threshold), status = VALUES(status)`,
      [e.examSlug, e.title, e.minutes, e.pass, e.productSlug]
    );
  }

  // ── Sample questions (one per exam for demo) ──
  const sampleQuestions: { examSlug: string; prompt: string; a: string; b: string; c: string; d: string; answer: string; explanation: string }[] = [
    {
      examSlug: "pmp-mock-01",
      prompt: "A sponsor asks for a compressed delivery timeline after scope has already been baselined. What should the project manager do first?",
      a: "Update the schedule immediately to show support for the sponsor.",
      b: "Assess impact through integrated change control before committing.",
      c: "Ask the team to work overtime while deferring documentation.",
      d: "Remove lower-priority requirements without stakeholder review.",
      answer: "B",
      explanation: "Schedule compression changes affect scope, risk, and cost. The request should enter formal change control before commitment."
    },
    {
      examSlug: "capm-mock-01",
      prompt: "Which process group is primarily concerned with defining the project scope and establishing the project management plan?",
      a: "Initiating",
      b: "Planning",
      c: "Executing",
      d: "Monitoring & Controlling",
      answer: "B",
      explanation: "The Planning process group defines the scope, develops the project management plan, and establishes the course of action to attain project objectives."
    },
    {
      examSlug: "rmp-mock-01",
      prompt: "During risk identification, the team uses a fishbone diagram. Which technique category does this belong to?",
      a: "Data gathering",
      b: "Data analysis",
      c: "Expert judgment",
      d: "Interpersonal and team skills",
      answer: "B",
      explanation: "Cause-and-effect (fishbone/Ishikawa) diagrams are a data analysis technique used to identify root causes of risks."
    },
    {
      examSlug: "acp-mock-01",
      prompt: "In Scrum, who is responsible for maximising the value of the product resulting from the work of the Development Team?",
      a: "Scrum Master",
      b: "Product Owner",
      c: "Development Team",
      d: "Project Sponsor",
      answer: "B",
      explanation: "The Product Owner is responsible for maximising the value of the product and managing the Product Backlog."
    },
    {
      examSlug: "pm-essentials-01",
      prompt: "What document formally authorises the existence of a project and provides the project manager with authority to apply resources?",
      a: "Project Management Plan",
      b: "Project Charter",
      c: "Statement of Work",
      d: "Business Case",
      answer: "B",
      explanation: "The Project Charter formally authorises the project and gives the project manager the authority to use organisational resources."
    },
    {
      examSlug: "risk-mgmt-01",
      prompt: "A risk with high probability and high impact has been identified. What is the most appropriate first response strategy for a threat?",
      a: "Accept the risk",
      b: "Avoid the risk",
      c: "Transfer the risk",
      d: "Exploit the risk",
      answer: "B",
      explanation: "For high-probability, high-impact threats, avoidance — eliminating the threat entirely by changing the plan — is typically the preferred strategy."
    },
    {
      examSlug: "excel-basic-01",
      prompt: "Which Excel function calculates the average of a range of cells?",
      a: "=SUM()",
      b: "=AVERAGE()",
      c: "=COUNT()",
      d: "=MEDIAN()",
      answer: "B",
      explanation: "The AVERAGE function returns the arithmetic mean of the values in the specified range."
    },
    {
      examSlug: "excel-intermediate-01",
      prompt: "Which function combination is most flexible for looking up a value in any column of a table?",
      a: "VLOOKUP with TRUE",
      b: "HLOOKUP with FALSE",
      c: "INDEX-MATCH",
      d: "CONCATENATE",
      answer: "C",
      explanation: "INDEX-MATCH is more flexible than VLOOKUP because it can look up values in any direction and is not limited to searching the leftmost column."
    },
    {
      examSlug: "excel-advanced-01",
      prompt: "Which Excel feature allows you to import, transform, and clean data from multiple sources before loading it into the workbook?",
      a: "PivotTable",
      b: "Power Query",
      c: "Conditional Formatting",
      d: "Data Validation",
      answer: "B",
      explanation: "Power Query (Get & Transform) provides an ETL-like interface to import data from various sources, transform/clean it, and load it into Excel."
    },
    {
      examSlug: "strategic-pm-01",
      prompt: "When aligning projects to organisational strategy, which framework ensures that the right projects are selected for investment?",
      a: "Work Breakdown Structure",
      b: "Portfolio Management",
      c: "Earned Value Management",
      d: "Agile Release Planning",
      answer: "B",
      explanation: "Portfolio Management is the centralised management of projects and programmes to achieve strategic objectives, ensuring resources are allocated to the most valuable initiatives."
    },
    {
      examSlug: "ms-project-01",
      prompt: "In Microsoft Project, what does linking two tasks with a Finish-to-Start (FS) dependency mean?",
      a: "Both tasks start at the same time.",
      b: "The successor cannot start until the predecessor finishes.",
      c: "Both tasks must finish together.",
      d: "The predecessor cannot start until the successor finishes.",
      answer: "B",
      explanation: "Finish-to-Start (FS) is the most common dependency type — Task B cannot begin until Task A is complete."
    },
    {
      examSlug: "digital-pm-ai-01",
      prompt: "How can AI most effectively support project risk management?",
      a: "By replacing the project manager entirely.",
      b: "By analysing historical data to predict likely risks and their probabilities.",
      c: "By eliminating all project risks automatically.",
      d: "By generating random risk registers.",
      answer: "B",
      explanation: "AI analyses historical project data and patterns to predict likely risks, estimate probabilities, and suggest mitigation strategies — augmenting the PM''s decision-making."
    },
    {
      examSlug: "jkr-scheduling-01",
      prompt: "In JKR project scheduling, what is the primary purpose of the S-curve?",
      a: "To show the organisational breakdown structure.",
      b: "To display cumulative progress against planned baseline over time.",
      c: "To list all project risks.",
      d: "To define the work breakdown structure.",
      answer: "B",
      explanation: "The S-curve is a graphical representation of cumulative costs, labour hours, or progress plotted against time — it compares planned vs actual progress and is mandatory for JKR project reporting."
    },
  ];

  for (const q of sampleQuestions) {
    await getPool().execute(
      `INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation)
       SELECT exams.id, ?, ?, ?, ?, ?, ?, ?
       FROM exams
       WHERE exams.slug = ?
         AND NOT EXISTS (SELECT 1 FROM questions WHERE questions.exam_id = exams.id LIMIT 1)`,
      [q.prompt, q.a, q.b, q.c, q.d, q.answer, q.explanation, q.examSlug]
    );
  }

  console.log("Seed complete. Demo logins: student@example.com / demo12345 and admin@example.com / admin12345");
  await getPool().end();
}

run().catch(async (error) => {
  console.error(error);
  await getPool().end();
  process.exitCode = 1;
});
