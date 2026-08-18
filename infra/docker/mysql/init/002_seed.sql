-- ═══════════════════════════════════════════════════════
-- Seed data: 13 Products (PM Advance training catalog)
-- ═══════════════════════════════════════════════════════

-- Product 1: PMP® Exam Preparation
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (1, 'pmp-exam-prep', 'PMP® Exam Preparation Practice Pack',
  'Comprehensive practice exams aligned to the latest PMP Examination Content Outline (ECO). Covers People, Process, and Business Environment domains with situational, scenario-based questions. Ideal for participants of PM Advance''s 5-day PMP® Exam Preparation Training (35 PDUs). Includes 1,000-question bank, timed simulations, and detailed answer explanations.',
  'Professional Certification', 'Advanced', 299.00, 90, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), category = VALUES(category), difficulty = VALUES(difficulty), price_usd = VALUES(price_usd), slug = VALUES(slug);

-- Product 2: CAPM® Exam Preparation
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (2, 'capm-exam-prep', 'CAPM® Exam Preparation Practice Pack',
  'Practice exams designed for the Certified Associate in Project Management (CAPM®) certification. Covers predictive, agile, and hybrid project management approaches based on the PMBOK® Guide 7th Edition. Perfect companion to PM Advance''s 3-day CAPM® Training (23 contact hours).',
  'Professional Certification', 'Intermediate', 199.00, 90, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), category = VALUES(category), difficulty = VALUES(difficulty), price_usd = VALUES(price_usd), slug = VALUES(slug);

-- Product 3: PMI-RMP® Risk Management
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (3, 'pmi-rmp-exam-prep', 'PMI-RMP® Risk Management Practice Pack',
  'Targeted practice exams for the PMI Risk Management Professional (PMI-RMP®) certification. Covers risk strategy, stakeholder engagement, risk process facilitation, risk monitoring, and advanced quantitative/qualitative analysis.',
  'Professional Certification', 'Advanced', 249.00, 90, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 4: PMI-ACP® Agile
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (4, 'pmi-acp-exam-prep', 'PMI-ACP® Agile Practice Pack',
  'Agile-focused practice exams for the PMI Agile Certified Practitioner (PMI-ACP®) certification. Covers Scrum, Kanban, Lean, XP, and hybrid frameworks.',
  'Professional Certification', 'Advanced', 249.00, 90, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 5: Project Management Essentials
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (5, 'pm-essentials', 'Project Management Essentials Practice Pack',
  'Foundational practice questions covering the complete project management lifecycle — initiating, planning, executing, monitoring & controlling, and closing. Based on globally recognised PMI methodology.',
  'Public Training', 'Beginner', 99.00, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 6: Project Risk Management
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (6, 'project-risk-management', 'Project Risk Management Practice Pack',
  'Practice questions focused on project risk management processes — risk identification, qualitative and quantitative analysis, risk response planning, and risk monitoring.',
  'Public Training', 'Intermediate', 99.00, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 7: Excel Basic
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (7, 'excel-basic', 'Microsoft Excel (Basic) Practice Pack',
  'Practice exercises and quiz questions covering Excel fundamentals — cell formatting, basic formulas (SUM, AVERAGE, COUNT, IF), sorting, filtering, charts, and print setup.',
  'Public Training', 'Beginner', 49.00, 30, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 8: Excel Intermediate
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (8, 'excel-intermediate', 'Microsoft Excel (Intermediate) Practice Pack',
  'Intermediate-level practice covering advanced formulas (VLOOKUP, HLOOKUP, INDEX-MATCH, nested IF), conditional formatting, data validation, PivotTables, and multi-sheet workbook management.',
  'Public Training', 'Intermediate', 49.00, 30, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 9: Excel Advanced
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (9, 'excel-advanced', 'Microsoft Excel (Advanced) Practice Pack',
  'Advanced practice pack covering Power Query, Power Pivot, advanced PivotTables, dynamic arrays (XLOOKUP, FILTER, SORT, UNIQUE), macro basics, and dashboard creation.',
  'Public Training', 'Advanced', 69.00, 30, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 10: Strategic PM for Senior Executives
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (10, 'strategic-pm-executives', 'Strategic PM for Senior Executives Practice Pack',
  'Executive-level practice scenarios covering strategic project alignment, portfolio governance, benefits realisation, organisational change management, and PMO frameworks.',
  'In-House Training', 'Advanced', 199.00, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 11: MS Project Professional Scheduling
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (11, 'ms-project-scheduling', 'MS Project Professional Scheduling Practice Pack',
  'Practice questions and exercises on Microsoft Project — WBS creation, task dependencies, resource assignment, baseline tracking, critical path analysis, and progress reporting.',
  'Public Training', 'Intermediate', 99.00, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 12: Digital PM Using AI
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (12, 'digital-pm-ai', 'Digital Project Management Using AI Practice Pack',
  'Practice scenarios exploring AI-powered project management — leveraging AI for scheduling, risk prediction, resource optimisation, stakeholder communication, and decision support.',
  'Public Training', 'Intermediate', 99.00, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Product 13: Advanced Scheduling (JKR Compliance)
INSERT INTO products (id, slug, title, description, category, difficulty, price_usd, access_days, visibility)
VALUES (13, 'advanced-scheduling-jkr', 'Advanced Scheduling Mastery: MS Project for JKR Compliance',
  'Specialised practice pack for government project scheduling using Microsoft Project with JKR (Jabatan Kerja Raya) compliance requirements. Covers S-curve reporting, earned value management, progress claim preparation, and scheduling standards.',
  'Public Training', 'Advanced', 129.00, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

-- Exam 1: PMP Mock Exam 01 (under PMP Sprint Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (1, 1, 'pmp-mock-01', 'PMP Mock Exam 01', 30, 70, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Exam 2: CAPM Mock Exam 01 (under CAPM Foundation Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (2, 2, 'capm-mock-01', 'CAPM Mock Exam 01', 20, 65, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Exam 3: PMP Mock Exam 02 (under PMP Sprint Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (5, 1, 'pmp-mock-02', 'PMP Mock Exam 02', 30, 70, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Exam 4: PMP Focus – Agile & Hybrid (under PMP Sprint Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (6, 1, 'pmp-focus-agile', 'PMP Focus – Agile & Hybrid', 20, 70, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Exam 5: PMP Focus – Risk & Stakeholders (under PMP Sprint Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (7, 1, 'pmp-focus-risk', 'PMP Focus – Risk & Stakeholders', 20, 70, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Exam 6: CAPM Mock Exam 02 (under CAPM Foundation Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (8, 2, 'capm-mock-02', 'CAPM Mock Exam 02', 20, 65, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Exam 7: CAPM Focus – Process Groups (under CAPM Foundation Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (9, 2, 'capm-focus-process', 'CAPM Focus – Process Groups', 15, 65, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Exam 8: CAPM Focus – Knowledge Areas (under CAPM Foundation Pack)
INSERT INTO exams (id, product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (10, 2, 'capm-focus-knowledge', 'CAPM Focus – Knowledge Areas', 15, 65, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title), time_limit_minutes = VALUES(time_limit_minutes);

-- Starter exams for products 3-13
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (3, 'rmp-mock-01', 'PMI-RMP® Mock Exam 01', 150, 70, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (4, 'acp-mock-01', 'PMI-ACP® Mock Exam 01', 180, 70, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (5, 'pm-essentials-01', 'PM Essentials Quiz 01', 60, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (6, 'risk-mgmt-01', 'Project Risk Management Quiz 01', 60, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (7, 'excel-basic-01', 'Excel Basic Quiz 01', 30, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (8, 'excel-intermediate-01', 'Excel Intermediate Quiz 01', 45, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (9, 'excel-advanced-01', 'Excel Advanced Quiz 01', 45, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (10, 'strategic-pm-01', 'Strategic PM for Executives Quiz 01', 90, 65, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (11, 'ms-project-01', 'MS Project Scheduling Quiz 01', 60, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (12, 'digital-pm-ai-01', 'Digital PM Using AI Quiz 01', 60, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (13, 'jkr-scheduling-01', 'Advanced Scheduling (JKR) Quiz 01', 60, 60, 'published')
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ═══════════════════════════════════════════════════════
-- PMP Mock Exam 01 — 10 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'A sponsor asks the project manager to compress the delivery timeline after the scope has already been baselined. What should the project manager do FIRST?',
 'Update the schedule immediately to show support for the sponsor.',
 'Assess the impact through integrated change control before committing.',
 'Ask the team to work overtime while deferring documentation.',
 'Remove lower-priority requirements without stakeholder review.',
 'B',
 'Schedule compression changes affect scope, risk, and cost. The PMBOK Guide requires that all change requests go through integrated change control before any commitment is made. This ensures proper impact analysis across all project constraints.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'During a sprint retrospective, two team members have a heated disagreement about coding standards. The Scrum Master should:',
 'Immediately end the meeting to prevent further conflict.',
 'Take sides with the more experienced developer.',
 'Facilitate the discussion to help the team reach consensus on a shared standard.',
 'Escalate the issue to the project sponsor for resolution.',
 'C',
 'The Scrum Master serves the team by facilitating healthy discussions. Conflicts about technical practices should be resolved within the team through collaboration. The retrospective is the appropriate ceremony for process improvements including coding standards.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'A project manager discovers that a critical vendor deliverable will be delayed by three weeks. The project is on a fixed deadline. What is the BEST course of action?',
 'Accept the delay and update the project schedule accordingly.',
 'Find an alternative vendor who can deliver sooner and switch immediately.',
 'Evaluate options including crashing, fast-tracking, and scope reduction, then present alternatives to stakeholders.',
 'Inform the sponsor that the deadline cannot be met.',
 'C',
 'When facing schedule constraints, the project manager should analyze multiple recovery options before committing to any single approach. Presenting alternatives to stakeholders allows for informed decision-making that considers trade-offs between cost, time, scope, and quality.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'A stakeholder who was not identified during planning suddenly requests major changes to the project scope. The project manager should FIRST:',
 'Reject the request since the stakeholder was not in the original stakeholder register.',
 'Implement the changes immediately to maintain stakeholder satisfaction.',
 'Update the stakeholder register and assess the impact of the requested changes.',
 'Ask the project sponsor to handle the situation.',
 'C',
 'New stakeholders can emerge at any point during a project. The correct approach is to update the stakeholder register and then evaluate the impact of their requests through the change control process. No legitimate stakeholder should be dismissed simply because they were not identified earlier.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'The project team is using an agile approach. The product owner has not been available for the last two sprints, causing the team to make assumptions about requirements. What should the project manager do?',
 'Continue with the team''s assumptions since they understand the domain.',
 'Escalate the product owner''s absence to the appropriate management level.',
 'Have the Scrum Master assume the product owner role temporarily.',
 'Pause the project until the product owner returns.',
 'B',
 'The product owner is essential to agile projects for prioritizing the backlog and providing direction. When the product owner is unavailable, it creates significant risk. The project manager should escalate this impediment to ensure the product owner role is properly fulfilled.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'During project execution, the earned value metrics show CPI = 0.85 and SPI = 1.10. What does this indicate?',
 'The project is under budget and behind schedule.',
 'The project is over budget and ahead of schedule.',
 'The project is under budget and ahead of schedule.',
 'The project is over budget and behind schedule.',
 'B',
 'CPI (Cost Performance Index) less than 1.0 means the project is spending more than planned (over budget). SPI (Schedule Performance Index) greater than 1.0 means the project is progressing faster than planned (ahead of schedule). So the project is over budget but ahead of schedule.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'A project manager is leading a hybrid project that uses both predictive and agile elements. The predictive components have detailed requirements, while the agile components use user stories. A new regulatory requirement affects both components. What approach should the PM take?',
 'Apply the change to the predictive components through formal change control and let the agile team handle it in their backlog.',
 'Run both changes through formal change control since it is a regulatory requirement.',
 'Submit a single integrated change request that addresses both components with appropriate handling for each methodology.',
 'Let each team decide independently how to incorporate the regulatory change.',
 'C',
 'In a hybrid project, regulatory changes require coordinated governance. An integrated change request ensures both the predictive and agile components address the requirement consistently, while allowing each to use methodology-appropriate implementation approaches.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'Which risk response strategy involves shifting the negative impact of a risk to a third party?',
 'Mitigate',
 'Avoid',
 'Transfer',
 'Accept',
 'C',
 'Transfer is the risk response strategy where the project team shifts the impact of a threat to a third party, together with ownership of the response. Common examples include insurance, performance bonds, warranties, and fixed-price contracts. The risk is not eliminated, but the responsibility for managing it is shifted.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'A team member consistently delivers high-quality work but refuses to participate in team meetings and communication. The project manager should:',
 'Accept the situation as long as deliverables are meeting quality standards.',
 'Have a private conversation with the team member to understand barriers and emphasize the importance of team collaboration.',
 'Reassign the team member to a role with less collaboration requirements.',
 'Formally document the behavior and escalate to HR immediately.',
 'B',
 'Effective project managers address interpersonal challenges proactively. A private conversation allows the PM to understand root causes (introversion, conflict, or other issues) and coach the team member on the value of collaboration while respecting their communication style.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1,
 'The project charter has been approved and the project manager is assigned. What should the project manager do NEXT?',
 'Begin creating the work breakdown structure.',
 'Identify stakeholders and begin stakeholder analysis.',
 'Start recruiting the project team.',
 'Develop the project schedule.',
 'B',
 'After the charter is approved, the first step in the Initiating process group is stakeholder identification. Understanding who the stakeholders are and their expectations is critical before beginning planning activities like WBS creation or scheduling. The stakeholder register informs many subsequent planning processes.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- CAPM Mock Exam 01 — 10 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'What is the primary purpose of a project charter?',
 'To provide a detailed project schedule.',
 'To formally authorize the project and give the project manager authority to use organizational resources.',
 'To define the work breakdown structure.',
 'To list all project risks and their responses.',
 'B',
 'The project charter formally authorizes the existence of a project and provides the project manager with the authority to apply organizational resources to project activities. It is created during the Initiating process group and is a key input to planning.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'Which of the following is NOT one of the triple constraints of project management?',
 'Scope',
 'Time',
 'Quality',
 'Cost',
 'C',
 'The traditional triple constraint (also called the iron triangle) consists of Scope, Time, and Cost. While Quality is closely related and often considered a fourth dimension, it is not part of the original triple constraint model. Changes to any one constraint typically affect one or both of the others.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'A Work Breakdown Structure (WBS) is BEST described as:',
 'A list of tasks assigned to team members.',
 'A hierarchical decomposition of the total scope of work to accomplish project objectives.',
 'A Gantt chart showing the project schedule.',
 'A document listing project risks.',
 'B',
 'The WBS is a hierarchical decomposition of the total scope of work to be carried out by the project team. It organizes and defines the total scope of the project. Each descending level represents an increasingly detailed definition of the project work, with the lowest level being work packages.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'During which process group is the project budget typically established?',
 'Initiating',
 'Planning',
 'Executing',
 'Monitoring and Controlling',
 'B',
 'The project budget is typically determined during the Planning process group, specifically in the Determine Budget process. This process aggregates the estimated costs of individual activities or work packages to establish an authorized cost baseline against which project performance can be monitored and controlled.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'What is the critical path in a project schedule?',
 'The shortest sequence of activities that must be completed on time.',
 'The longest sequence of activities that determines the minimum project duration.',
 'The path with the most resources allocated.',
 'The sequence of activities with the highest risk.',
 'B',
 'The critical path is the longest sequence of dependent activities that determines the minimum total duration of the project. Any delay in a critical path activity directly delays the project completion date. Activities on the critical path have zero or negative total float.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'A project stakeholder is BEST defined as:',
 'Anyone who funds the project.',
 'An individual, group, or organization that may affect, be affected by, or perceive itself to be affected by a decision, activity, or outcome of the project.',
 'Only the project team members and sponsor.',
 'The customer who receives the project deliverable.',
 'B',
 'According to the PMBOK Guide, a stakeholder is any individual, group, or organization that may affect, be affected by, or perceive itself to be affected by a decision, activity, or outcome of a project. This broad definition includes internal and external parties, both positive and negative stakeholders.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'What is the purpose of a lessons learned register?',
 'To document team member performance evaluations.',
 'To record knowledge gained during the project that can be used to improve future projects.',
 'To track project risks and their status.',
 'To maintain a log of all project changes.',
 'B',
 'The lessons learned register documents knowledge gained during the project including what went well, what could be improved, and recommended actions. This information is invaluable for future projects and contributes to the organizational process assets available to the entire organization.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'In agile project management, what is a "sprint"?',
 'A meeting where the team plans the entire project.',
 'A time-boxed iteration, typically 2-4 weeks, during which a potentially releasable product increment is created.',
 'A daily status meeting lasting 15 minutes.',
 'The final phase of the project lifecycle.',
 'B',
 'A sprint (also called an iteration) is a time-boxed period, typically 2-4 weeks long, during which the development team works to create a potentially releasable product increment. Each sprint has a defined goal and results in a done, usable, potentially releasable product increment.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'The Monitoring and Controlling process group is responsible for:',
 'Defining project scope and creating the WBS.',
 'Tracking, reviewing, and reporting project progress and performance against the project management plan.',
 'Executing the work defined in the project management plan.',
 'Formally closing the project or phase.',
 'B',
 'The Monitoring and Controlling process group consists of processes required to track, review, and report project progress and performance. It helps identify areas where changes to the plan are required and initiates corresponding changes. This group operates throughout the entire project lifecycle.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2,
 'What does RACI stand for in project management?',
 'Risk, Assessment, Control, Implementation',
 'Responsible, Accountable, Consulted, Informed',
 'Requirements, Analysis, Coding, Integration',
 'Review, Approve, Communicate, Implement',
 'B',
 'RACI is a responsibility assignment matrix that defines roles for tasks: Responsible (who does the work), Accountable (who is ultimately answerable), Consulted (who provides input), and Informed (who needs to be kept updated). It helps clarify roles and responsibilities in project teams.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- PMP Mock Exam 02 (exam_id = 5) — 5 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(5, 'A project manager notices that the team velocity has dropped significantly over the last three sprints. What should the PM do FIRST?',
 'Add more team members to increase capacity.',
 'Investigate root causes by reviewing retrospective feedback and team dynamics.',
 'Extend the sprint duration to allow more time.',
 'Report the velocity drop to the sponsor immediately.',
 'B', 'Before taking corrective action, the PM must understand why velocity dropped. Root cause analysis through retrospective data and direct team engagement reveals whether the issue is technical debt, team morale, impediments, or other factors.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(5, 'During project planning, the team identifies a risk with a probability of 0.3 and an impact of $50,000. What is the Expected Monetary Value (EMV)?',
 '$15,000', '$50,000', '$150,000', '$35,000',
 'A', 'EMV = Probability x Impact = 0.3 x $50,000 = $15,000. EMV is used in quantitative risk analysis to calculate the average outcome of scenarios that may or may not happen.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(5, 'A functional manager wants to pull a key resource from the project for two weeks. The project manager should:',
 'Agree immediately to maintain the relationship with the functional manager.',
 'Refuse the request and escalate to the sponsor.',
 'Assess the impact on the project schedule and negotiate alternatives.',
 'Replace the resource with a less experienced team member.',
 'C', 'Resource conflicts require negotiation. The PM should first assess the schedule and deliverable impact, then negotiate with the functional manager for alternatives such as partial allocation, timing adjustments, or temporary replacement.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(5, 'What is the PRIMARY purpose of a project kickoff meeting?',
 'To assign all tasks to team members.',
 'To align stakeholders on project objectives, approach, and expectations.',
 'To create the project schedule.',
 'To negotiate the project budget.',
 'B', 'The kickoff meeting establishes a shared understanding of the project purpose, scope, key milestones, roles, and communication approach. It builds commitment and sets the tone for collaboration among all stakeholders.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(5, 'Which document defines the project scope, deliverables, assumptions, and constraints in detail?',
 'Project charter', 'Project scope statement', 'Work breakdown structure', 'Requirements traceability matrix',
 'B', 'The project scope statement provides a detailed description of the project scope, major deliverables, assumptions, and constraints. While the charter authorizes the project at a high level, the scope statement provides the detailed scope baseline for planning.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- PMP Focus – Agile & Hybrid (exam_id = 6) — 5 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(6, 'In Scrum, who is responsible for maximizing the value of the product?',
 'Scrum Master', 'Development Team', 'Product Owner', 'Project Sponsor',
 'C', 'The Product Owner is responsible for maximizing the value of the product resulting from the work of the Development Team. They manage the product backlog, prioritize items, and ensure the team works on the most valuable features.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(6, 'What is the purpose of a daily standup in agile?',
 'To provide a status report to management.',
 'To synchronize activities, inspect progress toward the sprint goal, and adapt the plan.',
 'To resolve complex technical problems.',
 'To estimate story points for upcoming work.',
 'B', 'The daily standup (or daily scrum) is a 15-minute time-boxed event for the development team to synchronize activities, identify impediments, and create a plan for the next 24 hours. It is not a status meeting for management.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(6, 'A hybrid project approach is BEST described as:',
 'Using only agile for the entire project.',
 'A combination of predictive and adaptive approaches tailored to the project context.',
 'Starting with waterfall and converting to agile midway.',
 'Using agile for planning and waterfall for execution.',
 'B', 'A hybrid approach combines elements of both predictive (waterfall) and adaptive (agile) methodologies. The mix is tailored based on project characteristics, organizational context, and the nature of different project components.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(6, 'In Kanban, what is the purpose of WIP (Work in Progress) limits?',
 'To ensure team members are always busy.',
 'To prevent bottlenecks and improve flow by limiting concurrent work.',
 'To track how many hours each person works.',
 'To define the maximum number of team members.',
 'B', 'WIP limits constrain the number of items that can be in progress at any stage. This prevents overloading, exposes bottlenecks quickly, and encourages finishing work before starting new work, leading to smoother flow and shorter lead times.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(6, 'What is a product backlog refinement session?',
 'A meeting to review completed sprint work.',
 'An activity where the team and Product Owner add detail, estimates, and order to backlog items.',
 'A ceremony to plan the next release.',
 'A retrospective focused on product quality.',
 'B', 'Product backlog refinement (also called grooming) is the act of adding detail, estimates, and order to items in the Product Backlog. It is an ongoing process that ensures upcoming backlog items are ready for selection in sprint planning.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- PMP Focus – Risk & Stakeholders (exam_id = 7) — 5 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(7, 'A risk register entry shows a risk with high probability and high impact that currently has no response plan. This is classified as:',
 'A residual risk', 'A secondary risk', 'An unmitigated threat requiring immediate attention', 'An accepted risk',
 'C', 'A high-probability, high-impact risk without a response plan represents a significant exposure to the project. This requires immediate attention to develop an appropriate response strategy (avoid, transfer, mitigate, or escalate).')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(7, 'What is the BEST tool for stakeholder engagement assessment?',
 'RACI matrix', 'Stakeholder engagement assessment matrix', 'Power/interest grid', 'Communication management plan',
 'B', 'The stakeholder engagement assessment matrix compares current engagement levels against desired engagement levels for each stakeholder. It helps identify gaps and plan appropriate engagement strategies. The power/interest grid is used for classification, not assessment.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(7, 'A project team identifies an opportunity that could reduce the project timeline by 20%. The BEST response strategy is:',
 'Accept', 'Exploit', 'Avoid', 'Transfer',
 'B', 'Exploit is the positive risk (opportunity) response strategy where the team tries to ensure the opportunity definitely occurs. For a significant schedule reduction opportunity, active exploitation is the most appropriate strategy.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(7, 'A stakeholder who has high power but low interest in the project should be managed by:',
 'Monitoring them closely', 'Keeping them satisfied', 'Keeping them informed', 'Managing them closely',
 'B', 'According to the power/interest grid: high power + low interest stakeholders should be kept satisfied. They can influence the project significantly but are not actively engaged, so the strategy is to meet their needs without overwhelming them with information.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(7, 'What is a secondary risk?',
 'A risk that has low probability.', 'A risk that arises as a direct result of implementing a risk response.', 'The second most important risk on the register.', 'A risk identified during the execution phase.',
 'B', 'A secondary risk is a new risk that comes about as a direct result of implementing a risk response. For example, outsourcing to mitigate a technical risk may introduce a new risk related to vendor reliability.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- CAPM Mock Exam 02 (exam_id = 8) — 5 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(8, 'Which process group formally authorizes a new project or phase?',
 'Planning', 'Initiating', 'Executing', 'Closing',
 'B', 'The Initiating process group includes the processes performed to define a new project or new phase of an existing project by obtaining authorization to start. The project charter is the key output that formally authorizes the project.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(8, 'What is the MAIN difference between a project and operations?',
 'Projects are larger than operations.', 'Projects are temporary and create unique deliverables; operations are ongoing and repetitive.', 'Projects require more resources.', 'Operations are managed by project managers.',
 'B', 'Projects are temporary endeavors undertaken to create unique products, services, or results. Operations are ongoing, repetitive activities that sustain an organization. This distinction is fundamental to understanding project management.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(8, 'A milestone in a project schedule represents:',
 'A task that takes exactly one day.',
 'A significant point or event in the project with zero duration.',
 'The longest task in the project.',
 'A recurring team meeting.',
 'B', 'A milestone is a significant point or event in a project that has zero duration. Milestones are used to mark key achievements, decision points, or phase completions. They help track progress at a summary level.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(8, 'The Closing process group includes:',
 'Creating the project management plan.',
 'Finalizing all activities to formally complete the project or phase.',
 'Identifying project stakeholders.',
 'Monitoring project performance.',
 'B', 'The Closing process group includes processes performed to formally complete or close a project, phase, or contract. Key activities include final deliverable acceptance, lessons learned documentation, and releasing project resources.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(8, 'What is the purpose of a responsibility assignment matrix (RAM)?',
 'To list all project risks.', 'To show the relationship between work packages and team members.', 'To define the project schedule.', 'To track project costs.',
 'B', 'A RAM shows the relationship between work packages or activities and project team members. The most common type is the RACI chart. It ensures clear accountability and prevents tasks from falling through the cracks.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- CAPM Focus – Process Groups (exam_id = 9) — 5 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(9, 'How many process groups are defined in the PMBOK Guide?',
 'Four', 'Five', 'Six', 'Ten',
 'B', 'The PMBOK Guide defines five process groups: Initiating, Planning, Executing, Monitoring and Controlling, and Closing. These process groups are not project phases but rather logical groupings of project management processes.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(9, 'Which process group has the MOST processes?',
 'Initiating', 'Planning', 'Executing', 'Monitoring and Controlling',
 'B', 'The Planning process group contains the most processes (24 out of 49 in PMBOK 6th edition). This reflects the importance of thorough planning in project management and the many subsidiary plans that must be developed.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(9, 'The Executing process group is primarily concerned with:',
 'Defining the project scope.',
 'Completing the work defined in the project management plan to satisfy requirements.',
 'Creating the project budget.',
 'Formally closing the project.',
 'B', 'The Executing process group involves coordinating people and resources, managing stakeholder expectations, and integrating and performing the activities of the project in accordance with the project management plan.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(9, 'Which process group runs concurrently with all other process groups?',
 'Initiating', 'Planning', 'Executing', 'Monitoring and Controlling',
 'D', 'Monitoring and Controlling processes span the entire project lifecycle. They run concurrently with processes from all other process groups to track, review, and regulate the progress and performance of the project.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(9, 'What is the key output of the Initiating process group?',
 'Project management plan', 'Project charter and stakeholder register', 'Work breakdown structure', 'Final project report',
 'B', 'The Initiating process group produces the project charter (which formally authorizes the project) and the stakeholder register (which identifies all stakeholders). These documents form the foundation for all subsequent planning.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- CAPM Focus – Knowledge Areas (exam_id = 10) — 5 Questions
-- ═══════════════════════════════════════════════════════

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(10, 'How many knowledge areas are defined in the PMBOK Guide (6th edition)?',
 'Five', 'Eight', 'Ten', 'Twelve',
 'C', 'The PMBOK Guide (6th edition) defines ten knowledge areas: Integration, Scope, Schedule, Cost, Quality, Resource, Communications, Risk, Procurement, and Stakeholder Management. Each knowledge area represents a complete set of concepts and activities.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(10, 'Which knowledge area is considered the "umbrella" that coordinates all other knowledge areas?',
 'Scope Management', 'Project Integration Management', 'Stakeholder Management', 'Communications Management',
 'B', 'Project Integration Management is the umbrella knowledge area that coordinates all aspects of the project. It includes developing the charter, project plan, directing work, managing knowledge, monitoring, performing change control, and closing the project.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(10, 'The Schedule Management knowledge area includes which of these processes?',
 'Estimate Costs and Determine Budget', 'Define Activities, Sequence Activities, and Develop Schedule', 'Plan Quality and Perform Quality Assurance', 'Identify Risks and Plan Risk Responses',
 'B', 'Project Schedule Management includes: Plan Schedule Management, Define Activities, Sequence Activities, Estimate Activity Durations, Develop Schedule, and Control Schedule. These processes ensure timely completion of the project.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(10, 'Which knowledge area deals with identifying, analyzing, and responding to project risks?',
 'Quality Management', 'Risk Management', 'Procurement Management', 'Scope Management',
 'B', 'Project Risk Management includes processes for planning risk management, identifying risks, performing qualitative and quantitative risk analysis, planning risk responses, implementing responses, and monitoring risks throughout the project.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(10, 'Project Procurement Management is primarily concerned with:',
 'Managing the project team.', 'Acquiring goods and services from outside the project team.', 'Creating the project budget.', 'Defining project scope.',
 'B', 'Project Procurement Management includes the processes necessary to purchase or acquire products, services, or results needed from outside the project team. It covers planning procurement, conducting procurements, and controlling procurements.')
ON DUPLICATE KEY UPDATE prompt = VALUES(prompt);

-- ═══════════════════════════════════════════════════════
-- Demo accounts: admin + student (password = demo12345)
-- bcrypt hash for "demo12345"
-- ═══════════════════════════════════════════════════════

INSERT IGNORE INTO users (email, full_name, password_hash, role, status)
VALUES ('admin@example.com', 'Admin User',
  '$2b$12$LJ3m4ys3Lk0TSwMCPNEuAOlPRZSMFjg0Nv1gVJWfHqNr7SXNhIXy',
  'admin', 'active');

INSERT IGNORE INTO users (email, full_name, password_hash, role, status)
VALUES ('student@example.com', 'Demo Student',
  '$2b$12$LJ3m4ys3Lk0TSwMCPNEuAOlPRZSMFjg0Nv1gVJWfHqNr7SXNhIXy',
  'student', 'active');

INSERT INTO users (email, full_name, password_hash, role, status)
VALUES ('expired@example.com', 'Expired Demo Student',
  '$2b$12$LJ3m4ys3Lk0TSwMCPNEuAOlPRZSMFjg0Nv1gVJWfHqNr7SXNhIXy',
  'student', 'active')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role), status = VALUES(status);

INSERT INTO user_session_policies (user_id, max_sessions, refresh_ttl_days)
SELECT id, 3, 14 FROM users WHERE email = 'student@example.com'
ON DUPLICATE KEY UPDATE max_sessions = VALUES(max_sessions), refresh_ttl_days = VALUES(refresh_ttl_days);

INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
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
  );

UPDATE enrollments
INNER JOIN users ON users.id = enrollments.user_id
INNER JOIN products ON products.id = enrollments.product_id
SET enrollments.starts_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 120 DAY),
    enrollments.expires_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY),
    enrollments.status = 'expired'
WHERE users.email = 'expired@example.com'
  AND products.slug = 'pmp-exam-prep';

INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
SELECT users.id, products.id, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 120 DAY), DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY), 'expired'
FROM users
INNER JOIN products ON products.slug = 'pmp-exam-prep'
WHERE users.email = 'expired@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.user_id = users.id
      AND e.product_id = products.id
  );

-- ═══════════════════════════════════════════════════════
-- Demo voucher
-- ═══════════════════════════════════════════════════════
INSERT INTO vouchers (id, code, type, amount, min_order, usage_limit, per_user_limit, valid_from, valid_until, status)
VALUES
  (1, 'SAVE10', 'percentage', 10.00, 0.00, 1000, 100, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY), DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 YEAR), 'active'),
  (2, 'EXPIRED10', 'percentage', 10.00, 0.00, 1000, 100, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 YEAR), DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 YEAR), 'active')
ON DUPLICATE KEY UPDATE code = VALUES(code), type = VALUES(type), amount = VALUES(amount),
  min_order = VALUES(min_order), usage_limit = VALUES(usage_limit), per_user_limit = VALUES(per_user_limit),
  valid_from = VALUES(valid_from), valid_until = VALUES(valid_until), status = VALUES(status);
