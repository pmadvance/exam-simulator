-- Add eco_domain, performance_domain and justification columns to questions table
ALTER TABLE questions
  ADD COLUMN eco_domain VARCHAR(120) NULL AFTER explanation,
  ADD COLUMN performance_domain VARCHAR(120) NULL AFTER eco_domain,
  ADD COLUMN justification TEXT NULL AFTER performance_domain;

-- Also add to question_versions for versioning support
ALTER TABLE question_versions
  ADD COLUMN eco_domain VARCHAR(120) NULL AFTER explanation,
  ADD COLUMN performance_domain VARCHAR(120) NULL AFTER eco_domain,
  ADD COLUMN justification TEXT NULL AFTER performance_domain;
