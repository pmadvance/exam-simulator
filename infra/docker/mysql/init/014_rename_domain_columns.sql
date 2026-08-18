-- Rename tag → eco_domain and category → performance_domain in questions table
-- Also add new domain management tables for per-product domain lists

-- Rename columns in questions table
ALTER TABLE questions CHANGE COLUMN tag eco_domain VARCHAR(120) NULL;
ALTER TABLE questions CHANGE COLUMN category performance_domain VARCHAR(120) NULL;

-- Rename columns in question_versions table
ALTER TABLE question_versions CHANGE COLUMN tag eco_domain VARCHAR(120) NULL;
ALTER TABLE question_versions CHANGE COLUMN category performance_domain VARCHAR(120) NULL;

-- Domain management tables (per-product)
CREATE TABLE IF NOT EXISTS eco_domains (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_eco_domains_product FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY uq_eco_domain_product_name (product_id, name)
);

CREATE TABLE IF NOT EXISTS performance_domains (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_performance_domains_product FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY uq_performance_domain_product_name (product_id, name)
);

-- Seed PMP ECO Domains (product_id = 13)
INSERT INTO eco_domains (product_id, name, description) VALUES
  (13, 'People', 'Managing team, leadership, conflict resolution, stakeholder engagement'),
  (13, 'Process', 'Planning, executing, monitoring work, managing scope/schedule/cost'),
  (13, 'Business Environment', 'Benefits realization, compliance, organizational change, strategic alignment');

-- Seed PMP Performance Domains (product_id = 13)
INSERT INTO performance_domains (product_id, name, description) VALUES
  (13, 'Team', 'Building and managing the project team'),
  (13, 'Planning', 'Establishing project plans and baselines'),
  (13, 'Delivery', 'Delivering project value and managing quality'),
  (13, 'Project Work', 'Executing and managing project activities'),
  (13, 'Stakeholders', 'Engaging and managing stakeholder expectations'),
  (13, 'Measurement', 'Tracking and evaluating project performance'),
  (13, 'Uncertainty', 'Managing risks and ambiguity'),
  (13, 'Development Approach', 'Selecting and tailoring delivery approaches');

-- Seed CAPM ECO Domains (product_id = 14)
INSERT INTO eco_domains (product_id, name, description) VALUES
  (14, 'People', 'Team leadership, roles, servant leadership, RACI'),
  (14, 'Process', 'Process groups, scheduling, scope, quality, risk management'),
  (14, 'Business Environment', 'Business cases, feasibility, organizational strategy, PEST analysis');

-- Seed CAPM Performance Domains (product_id = 14)
INSERT INTO performance_domains (product_id, name, description) VALUES
  (14, 'Project Management Fundamentals', 'Core PM concepts — project definition, progressive elaboration, lessons learned'),
  (14, 'Predictive Methodologies', 'Waterfall/plan-driven — WBS, critical path, process groups, knowledge areas'),
  (14, 'Agile Frameworks', 'Scrum, Kanban — sprints, retrospectives, WIP limits, Product Owner, Scrum Master'),
  (14, 'Business Analysis', 'Business cases, feasibility studies, BCR, stakeholder analysis');
