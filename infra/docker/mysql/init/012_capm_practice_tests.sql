-- ================================================================
-- CAPM Practice Tests: 3 Tests × 10 Questions = 30 Questions
-- ECO Domains (eco_domain column): People, Process, Business Environment
-- Performance Domain categories: Project Management Fundamentals,
--   Predictive Methodologies, Agile Frameworks, Business Analysis
-- ================================================================

-- Practice Test 1
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (14, 'capm-practice-01', 'CAPM Practice Test 01', 30, 55, 'published');
SET @cexam1 = LAST_INSERT_ID();

-- Practice Test 2
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (14, 'capm-practice-02', 'CAPM Practice Test 02', 30, 55, 'published');
SET @cexam2 = LAST_INSERT_ID();

-- Practice Test 3
INSERT INTO exams (product_id, slug, title, time_limit_minutes, pass_threshold, status)
VALUES (14, 'capm-practice-03', 'CAPM Practice Test 03', 30, 55, 'published');
SET @cexam3 = LAST_INSERT_ID();


-- ================================================================
-- CAPM PRACTICE TEST 01 — 10 Questions
-- ================================================================

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, eco_domain, performance_domain) VALUES

(@cexam1,
 'Which of the following BEST describes a project?',
 'An ongoing operation that produces repetitive outputs',
 'A temporary endeavor undertaken to create a unique product, service, or result',
 'A series of tasks that must be completed in a specific order',
 'A group of related activities managed in a coordinated manner',
 'B',
 'A project is defined as a temporary endeavor undertaken to create a unique product, service, or result. This distinguishes it from ongoing operations.',
 'Process', 'Project Management Fundamentals'),

(@cexam1,
 'What is the PRIMARY purpose of a project charter?',
 'To provide a detailed work breakdown structure',
 'To formally authorize the project and document initial requirements and stakeholder expectations',
 'To define the project schedule',
 'To assign roles and responsibilities to team members',
 'B',
 'The project charter formally authorizes the existence of a project. It provides the project manager with the authority to apply organizational resources to project activities.',
 'Process', 'Predictive Methodologies'),

(@cexam1,
 'In the context of project management, what does the term "stakeholder" refer to?',
 'Only the project sponsor and team members',
 'Anyone who may affect, be affected by, or perceive themselves to be affected by a decision or activity of the project',
 'Only individuals who fund the project',
 'Only the end users of the project deliverable',
 'B',
 'Stakeholders include anyone who may affect or be affected by the project — sponsors, team members, customers, end users, regulators, and others.',
 'People', 'Project Management Fundamentals'),

(@cexam1,
 'Which process group is primarily concerned with defining and authorizing the project or a project phase?',
 'Planning',
 'Executing',
 'Initiating',
 'Closing',
 'C',
 'The Initiating Process Group includes processes performed to define a new project or phase by obtaining authorization to start. The charter is created here.',
 'Process', 'Predictive Methodologies'),

(@cexam1,
 'What is the purpose of a Work Breakdown Structure (WBS)?',
 'To list all project risks',
 'To decompose the total scope of work into smaller, manageable components',
 'To schedule project activities',
 'To assign budget to each team member',
 'B',
 'The WBS is a hierarchical decomposition of the total scope of work. It organizes and defines the total scope of the project into manageable work packages.',
 'Process', 'Predictive Methodologies'),

(@cexam1,
 'In an agile project, what role is responsible for maximizing the value of the product?',
 'Scrum Master',
 'Project Manager',
 'Product Owner',
 'Development Team',
 'C',
 'The Product Owner is responsible for maximizing the value of the product resulting from the work of the development team. They manage and prioritize the product backlog.',
 'People', 'Agile Frameworks'),

(@cexam1,
 'A project manager notices that the project is consistently over budget. Which tool would BEST help identify the primary causes of cost overruns?',
 'Gantt chart',
 'Pareto chart',
 'RACI matrix',
 'Network diagram',
 'B',
 'A Pareto chart ranks causes by frequency or impact. It follows the 80/20 rule and helps identify the vital few causes accounting for most of the problems.',
 'Process', 'Project Management Fundamentals'),

(@cexam1,
 'Which document describes the project scope, major deliverables, assumptions, and constraints?',
 'Project charter',
 'Project scope statement',
 'Work breakdown structure',
 'Requirements traceability matrix',
 'B',
 'The project scope statement describes, in detail, the project deliverables and the work required to create those deliverables. It includes scope, deliverables, assumptions, and constraints.',
 'Process', 'Predictive Methodologies'),

(@cexam1,
 'What is the PRIMARY benefit of conducting a stakeholder analysis at the beginning of a project?',
 'It eliminates all project risks',
 'It helps identify stakeholder interests, expectations, and potential influence on the project',
 'It assigns tasks to stakeholders',
 'It determines the project budget',
 'B',
 'Stakeholder analysis helps the PM understand who the stakeholders are, their expectations, and how best to engage them throughout the project lifecycle.',
 'People', 'Business Analysis'),

(@cexam1,
 'In agile methodology, what is a "sprint"?',
 'A long-term project phase lasting several months',
 'A time-boxed iteration, typically 1-4 weeks, during which a potentially shippable product increment is created',
 'A meeting to discuss project status',
 'A document that lists all project requirements',
 'B',
 'A sprint is a time-boxed iteration (usually 1-4 weeks) in Scrum where the team works to complete a set amount of work from the product backlog and produce a potentially shippable increment.',
 'Process', 'Agile Frameworks');


-- ================================================================
-- CAPM PRACTICE TEST 02 — 10 Questions
-- ================================================================

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, eco_domain, performance_domain) VALUES

(@cexam2,
 'What is the critical path in a project schedule?',
 'The path with the most resources assigned',
 'The longest sequence of dependent activities that determines the minimum project duration',
 'The path with the least risk',
 'The shortest path through the network diagram',
 'B',
 'The critical path is the longest path through the project schedule network. Any delay on a critical path activity directly delays the project end date.',
 'Process', 'Predictive Methodologies'),

(@cexam2,
 'Which of the following is an example of a negative risk (threat) response strategy?',
 'Exploit',
 'Enhance',
 'Mitigate',
 'Share',
 'C',
 'Mitigate is a negative risk (threat) response strategy that seeks to reduce the probability or impact of the risk to an acceptable threshold. Exploit, Enhance, and Share are positive risk (opportunity) strategies.',
 'Process', 'Project Management Fundamentals'),

(@cexam2,
 'A project team is using a Kanban board. What is the PRIMARY purpose of Work-In-Progress (WIP) limits?',
 'To increase the number of tasks being worked on simultaneously',
 'To limit the amount of work in each workflow state to improve flow and reduce bottlenecks',
 'To assign deadlines to each task',
 'To prioritize the product backlog',
 'B',
 'WIP limits restrict the number of items in each workflow column. This prevents overloading, identifies bottlenecks, and promotes continuous flow of work through the system.',
 'Process', 'Agile Frameworks'),

(@cexam2,
 'What is the difference between a project and a program?',
 'A project is larger than a program',
 'A program is a group of related projects managed in a coordinated way to obtain benefits not available from managing them individually',
 'A program has a fixed end date while a project does not',
 'A project always has a larger budget than a program',
 'B',
 'A program is a group of related projects, subsidiary programs, and program activities managed in a coordinated manner to obtain benefits not achievable from managing them individually.',
 'Business Environment', 'Project Management Fundamentals'),

(@cexam2,
 'During which process group does most of the project budget get spent?',
 'Initiating',
 'Planning',
 'Executing',
 'Closing',
 'C',
 'The majority of project resources and budget are consumed during the Executing Process Group, when the actual project work is performed to produce deliverables.',
 'Process', 'Predictive Methodologies'),

(@cexam2,
 'What is the purpose of a daily standup meeting in Scrum?',
 'To provide a status report to management',
 'To allow the development team to synchronize activities and create a plan for the next 24 hours',
 'To review the product backlog',
 'To demonstrate completed work to stakeholders',
 'B',
 'The daily standup (daily scrum) is a 15-minute time-boxed event for the development team to synchronize work and plan for the next 24 hours. It covers what was done, what will be done, and any impediments.',
 'People', 'Agile Frameworks'),

(@cexam2,
 'A business case for a project shows a benefit-cost ratio (BCR) of 2.5. What does this mean?',
 'The project costs 2.5 times more than expected',
 'The project benefits are 2.5 times greater than the project costs',
 'The project will take 2.5 years to complete',
 'The project has a 25% chance of success',
 'B',
 'A BCR of 2.5 means that for every RM 1 invested, the project returns RM 2.50 in benefits. A BCR greater than 1.0 indicates a worthwhile investment.',
 'Business Environment', 'Business Analysis'),

(@cexam2,
 'Which knowledge area is primarily focused on ensuring the project includes all the work required to complete the project successfully?',
 'Project Schedule Management',
 'Project Scope Management',
 'Project Cost Management',
 'Project Quality Management',
 'B',
 'Project Scope Management ensures the project includes all the work required, and only the work required, to complete the project successfully. It involves scope planning, definition, WBS creation, validation, and control.',
 'Process', 'Predictive Methodologies'),

(@cexam2,
 'What is a key characteristic of a servant leader project manager?',
 'They make all decisions for the team',
 'They focus on removing obstacles and empowering the team to succeed',
 'They closely monitor every team member task',
 'They prioritize their own goals above the team needs',
 'B',
 'A servant leader focuses on the growth and well-being of the team. They remove impediments, provide support, and empower team members rather than directing and controlling.',
 'People', 'Project Management Fundamentals'),

(@cexam2,
 'What is the main purpose of a feasibility study before initiating a project?',
 'To create the project schedule',
 'To evaluate whether the project is viable from a technical, financial, and operational perspective',
 'To assign project resources',
 'To develop the risk register',
 'B',
 'A feasibility study evaluates whether a proposed project is viable and worth pursuing. It examines technical feasibility, financial viability, market conditions, and operational capacity.',
 'Business Environment', 'Business Analysis');


-- ================================================================
-- CAPM PRACTICE TEST 03 — 10 Questions
-- ================================================================

INSERT INTO questions (exam_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, eco_domain, performance_domain) VALUES

(@cexam3,
 'What type of dependency exists when an activity cannot start until a predecessor activity has finished?',
 'Start-to-Start (SS)',
 'Finish-to-Start (FS)',
 'Finish-to-Finish (FF)',
 'Start-to-Finish (SF)',
 'B',
 'Finish-to-Start (FS) is the most common dependency type. The successor activity cannot start until the predecessor activity is completed.',
 'Process', 'Predictive Methodologies'),

(@cexam3,
 'In agile, what is the purpose of a retrospective?',
 'To demonstrate the completed increment to stakeholders',
 'To plan the next sprint backlog',
 'To reflect on the process and identify improvements for the next iteration',
 'To estimate the remaining work in the project',
 'C',
 'The retrospective is held at the end of each sprint for the team to inspect their process and identify what worked, what did not, and what improvements to make in the next sprint.',
 'Process', 'Agile Frameworks'),

(@cexam3,
 'What does the acronym RACI stand for in a responsibility assignment matrix?',
 'Risk, Analysis, Communication, Implementation',
 'Responsible, Accountable, Consulted, Informed',
 'Requirements, Assessment, Control, Inspection',
 'Resources, Allocation, Compliance, Integration',
 'B',
 'RACI stands for Responsible (does the work), Accountable (owns the outcome), Consulted (provides input), and Informed (kept updated). It clarifies roles for each deliverable.',
 'People', 'Project Management Fundamentals'),

(@cexam3,
 'Which of the following is a tool used for qualitative risk analysis?',
 'Monte Carlo simulation',
 'Probability and impact matrix',
 'Earned value analysis',
 'Critical path method',
 'B',
 'The probability and impact matrix is used in qualitative risk analysis to assess and prioritize identified risks based on their probability of occurrence and impact on project objectives.',
 'Process', 'Predictive Methodologies'),

(@cexam3,
 'What is the role of a Scrum Master in an agile team?',
 'To assign tasks to team members and monitor their progress',
 'To facilitate the Scrum process, remove impediments, and coach the team on agile practices',
 'To negotiate contracts with vendors',
 'To create the project budget and manage costs',
 'B',
 'The Scrum Master is a facilitator and coach. They ensure the team follows Scrum practices, remove obstacles, and protect the team from external interference.',
 'People', 'Agile Frameworks'),

(@cexam3,
 'What is progressive elaboration in project management?',
 'The process of continuously increasing the project budget',
 'The iterative process of increasing the level of detail in a project management plan as more information becomes available',
 'Adding new stakeholders as the project progresses',
 'The gradual reduction of project scope',
 'B',
 'Progressive elaboration means that project plans become more detailed and refined as more information and better estimates become available over time. It is a characteristic of projects.',
 'Process', 'Project Management Fundamentals'),

(@cexam3,
 'Which of the following BEST describes the purpose of a business case?',
 'To document the project schedule',
 'To provide the necessary information to determine whether the project justifies the required investment',
 'To list all project team members',
 'To define the testing strategy',
 'B',
 'A business case documents the business need and the cost-benefit analysis that justifies the project investment. It is used to determine if the project is worth pursuing.',
 'Business Environment', 'Business Analysis'),

(@cexam3,
 'In project quality management, what is the difference between quality assurance and quality control?',
 'There is no difference',
 'Quality assurance focuses on process improvements to prevent defects while quality control focuses on inspecting deliverables to find defects',
 'Quality control is done before quality assurance',
 'Quality assurance is only done during project closing',
 'B',
 'QA is proactive and process-focused (improving processes to prevent defects). QC is product-focused and reactive (inspecting outputs to identify defects through testing and reviews).',
 'Process', 'Predictive Methodologies'),

(@cexam3,
 'A project manager needs to understand the external factors that could affect the project. Which environmental analysis tool uses Political, Economic, Social, and Technological factors?',
 'SWOT analysis',
 'PEST analysis',
 'Fishbone diagram',
 'Affinity diagram',
 'B',
 'PEST analysis examines Political, Economic, Social, and Technological factors in the external environment that could impact the project or organization strategy.',
 'Business Environment', 'Business Analysis'),

(@cexam3,
 'What is the primary benefit of using a lessons learned register throughout the project rather than only at the end?',
 'It reduces the need for stakeholder engagement',
 'It allows the team to apply knowledge gained early to improve the current project and future projects',
 'It eliminates the need for a closing phase',
 'It reduces the project budget',
 'B',
 'Capturing lessons learned throughout the project enables the team to apply insights immediately to the current project, not just future ones. Waiting until closing means missed opportunities for improvement.',
 'People', 'Project Management Fundamentals');
