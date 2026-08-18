import mysql from "mysql2/promise";

import { env } from "./config.js";

let pool: mysql.Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

const runtimeSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS payment_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_key VARCHAR(120) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL,
    provider VARCHAR(40) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_events_order FOREIGN KEY (order_id) REFERENCES orders(id)
  )`,
  `CREATE TABLE IF NOT EXISTS attempts (
    id CHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    status ENUM('in_progress', 'submitted') NOT NULL DEFAULT 'in_progress',
    training_mode TINYINT(1) NOT NULL DEFAULT 0,
    answers_json JSON NOT NULL,
    marked_for_review_json JSON NOT NULL,
    score INT NULL,
    total_questions INT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_attempts_exam FOREIGN KEY (exam_id) REFERENCES exams(id)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash CHAR(64) NOT NULL,
    user_agent VARCHAR(255) NULL,
    ip_address VARCHAR(64) NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_session_policies (
    user_id BIGINT PRIMARY KEY,
    max_sessions INT NULL,
    refresh_ttl_days INT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_session_policies_user FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumed_at TIMESTAMP NULL,
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS question_import_batches (
    id CHAR(36) PRIMARY KEY,
    exam_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    csv_text LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP NULL,
    CONSTRAINT fk_import_batch_exam FOREIGN KEY (exam_id) REFERENCES exams(id),
    CONSTRAINT fk_import_batch_user FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS question_versions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    import_batch_id CHAR(36) NULL,
    version_no INT NOT NULL,
    question_order INT NOT NULL,
    prompt TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    explanation TEXT NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_question_versions_exam FOREIGN KEY (exam_id) REFERENCES exams(id),
    CONSTRAINT fk_question_versions_batch FOREIGN KEY (import_batch_id) REFERENCES question_import_batches(id),
    CONSTRAINT fk_question_versions_user FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS vouchers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(60) NOT NULL UNIQUE,
    type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed',
    amount DECIMAL(10, 2) NOT NULL,
    min_order DECIMAL(10, 2) NOT NULL DEFAULT 0,
    usage_limit INT NULL,
    per_user_limit INT NOT NULL DEFAULT 1,
    product_id BIGINT NULL,
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vouchers_product FOREIGN KEY (product_id) REFERENCES products(id)
  )`,
  `CREATE TABLE IF NOT EXISTS voucher_redemptions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    voucher_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vr_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
    CONSTRAINT fk_vr_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_vr_order FOREIGN KEY (order_id) REFERENCES orders(id)
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS eco_domains (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_eco_domains_product FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY uq_eco_domain_product_name (product_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS performance_domains (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_performance_domains_product FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY uq_performance_domain_product_name (product_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(120) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS email_verification_codes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    code CHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evc_email (email)
  )`,
  `CREATE TABLE IF NOT EXISTS referral_codes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    total_redemptions INT NOT NULL DEFAULT 0,
    total_reward_myr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_referral_codes_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uq_referral_user (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS referral_redemptions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    referral_code_id BIGINT NOT NULL,
    referrer_user_id BIGINT NOT NULL,
    referee_user_id BIGINT NOT NULL,
    order_id BIGINT NULL,
    referrer_voucher_id BIGINT NULL,
    referee_voucher_id BIGINT NULL,
    status ENUM('pending','rewarded','rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rewarded_at TIMESTAMP NULL,
    CONSTRAINT fk_referral_red_code FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id),
    CONSTRAINT fk_referral_red_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id),
    CONSTRAINT fk_referral_red_referee FOREIGN KEY (referee_user_id) REFERENCES users(id),
    UNIQUE KEY uq_referral_referee (referee_user_id),
    INDEX idx_referral_red_referrer (referrer_user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(255) NULL,
    contact_phone VARCHAR(50) NULL,
    seat_tier_override DECIMAL(5,2) NULL,
    notes TEXT NULL,
    status ENUM('active','suspended','archived') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS organization_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
    invited_email VARCHAR(255) NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_org_members_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uq_org_member (organization_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS organization_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    organization_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    seat_count INT NOT NULL,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_orders_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_org_orders_order FOREIGN KEY (order_id) REFERENCES orders(id),
    UNIQUE KEY uq_org_order (order_id)
  )`,
  `CREATE TABLE IF NOT EXISTS pdpa_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    request_type ENUM('access','correction','deletion','withdrawal','other') NOT NULL,
    message TEXT NULL,
    status ENUM('pending','in_progress','completed','rejected') NOT NULL DEFAULT 'pending',
    admin_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_pdpa_requests_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_pdpa_requests_user (user_id),
    INDEX idx_pdpa_requests_status (status)
  )`,
  `CREATE TABLE IF NOT EXISTS user_exam_goals (
    user_id BIGINT PRIMARY KEY,
    exam_date DATE NOT NULL,
    certification_label VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_exam_goals_user FOREIGN KEY (user_id) REFERENCES users(id)
  )`
] as const;

/** One-time column additions for existing databases. Errors (e.g. duplicate column) are silently ignored. */
const runtimeAlterStatements = [
  `ALTER TABLE products CHANGE COLUMN price_myr price_usd DECIMAL(10, 2) NOT NULL`,
  `ALTER TABLE orders ADD COLUMN gateway_provider VARCHAR(40) NULL AFTER total_amount`,
  `ALTER TABLE orders ADD COLUMN gateway_bill_code VARCHAR(255) NULL AFTER gateway_provider`,
  `ALTER TABLE orders ADD COLUMN cart_group_id CHAR(36) NULL AFTER gateway_bill_code`,
  `ALTER TABLE questions CHANGE COLUMN tag eco_domain VARCHAR(120) NULL`,
  `ALTER TABLE questions CHANGE COLUMN category performance_domain VARCHAR(120) NULL`,
  `ALTER TABLE question_versions CHANGE COLUMN tag eco_domain VARCHAR(120) NULL`,
  `ALTER TABLE question_versions CHANGE COLUMN category performance_domain VARCHAR(120) NULL`,
  `ALTER TABLE questions ADD COLUMN question_type ENUM('single_choice','multiple_response','true_false') NOT NULL DEFAULT 'single_choice' AFTER exam_id`,
  `ALTER TABLE questions MODIFY COLUMN correct_answer VARCHAR(10) NOT NULL`,
  `ALTER TABLE questions ADD COLUMN status ENUM('draft','published') NOT NULL DEFAULT 'published' AFTER image_url`,
  `ALTER TABLE question_versions ADD COLUMN question_type ENUM('single_choice','multiple_response','true_false') NOT NULL DEFAULT 'single_choice' AFTER question_order`,
  `ALTER TABLE question_versions MODIFY COLUMN correct_answer VARCHAR(10) NOT NULL`,
  `ALTER TABLE users MODIFY COLUMN role ENUM('student','admin','super_admin','content_admin','support_admin') NOT NULL DEFAULT 'student'`,
  `ALTER TABLE users ADD COLUMN age INT NULL AFTER full_name`,
  `ALTER TABLE users ADD COLUMN occupation VARCHAR(120) NULL AFTER age`,
  `ALTER TABLE users ADD COLUMN gender VARCHAR(40) NULL AFTER occupation`,
  `ALTER TABLE questions ADD COLUMN difficulty VARCHAR(20) NULL AFTER status`,
  `ALTER TABLE question_versions ADD COLUMN difficulty VARCHAR(20) NULL`,
  `ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL AFTER password_hash`,
  `ALTER TABLE enrollments ADD COLUMN starts_at TIMESTAMP NULL AFTER product_id`,
  `ALTER TABLE enrollments ADD COLUMN expires_at TIMESTAMP NULL AFTER starts_at`,
  `ALTER TABLE enrollments ADD COLUMN status ENUM('active','expired','revoked') NOT NULL DEFAULT 'active' AFTER expires_at`,
  `ALTER TABLE questions ADD COLUMN option_e TEXT NULL AFTER option_d`,
  `ALTER TABLE question_versions ADD COLUMN option_e TEXT NULL AFTER option_d`,
  `ALTER TABLE users ADD COLUMN privacy_accepted_at TIMESTAMP NULL AFTER email_verified_at`,
  `ALTER TABLE users ADD COLUMN privacy_notice_version VARCHAR(40) NULL AFTER privacy_accepted_at`,
  `ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP NULL AFTER privacy_notice_version`,
  `ALTER TABLE users ADD COLUMN terms_version VARCHAR(40) NULL AFTER terms_accepted_at`,
] as const;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      database: env.MYSQL_DATABASE,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      connectionLimit: 10,
      namedPlaceholders: true,
      timezone: "+00:00" // Use UTC for consistent timestamp handling
    });
  }

  return pool;
}

export async function canConnectToDatabase() {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch {
    return false;
  }
}

export async function ensureDatabaseTables() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      for (const statement of runtimeSchemaStatements) {
        await getPool().execute(statement);
      }
      // Run ALTER TABLE statements — ignore errors for already-existing columns
      for (const statement of runtimeAlterStatements) {
        try {
          await getPool().execute(statement);
        } catch {
          // Column likely already exists — safe to ignore
        }
      }
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}
