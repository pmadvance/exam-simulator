-- Migration: Add question_type and role-based access
-- Run after all previous migrations

-- 1. Add question_type to questions table
ALTER TABLE questions ADD COLUMN question_type ENUM('single_choice', 'multiple_response', 'true_false') NOT NULL DEFAULT 'single_choice' AFTER exam_id;

-- 2. Widen correct_answer from CHAR(1) to VARCHAR(10) to support multiple answers e.g. "A,C"
ALTER TABLE questions MODIFY COLUMN correct_answer VARCHAR(10) NOT NULL;

-- 3. Add question_type and widen correct_answer in question_versions
ALTER TABLE question_versions ADD COLUMN question_type ENUM('single_choice', 'multiple_response', 'true_false') NOT NULL DEFAULT 'single_choice' AFTER question_order;
ALTER TABLE question_versions MODIFY COLUMN correct_answer VARCHAR(10) NOT NULL;

-- 4. Add question_type to questions schema (for status workflow)
ALTER TABLE questions ADD COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'published' AFTER image_url;

-- 5. Add granular admin roles to users table
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'admin', 'super_admin', 'content_admin', 'support_admin') NOT NULL DEFAULT 'student';
