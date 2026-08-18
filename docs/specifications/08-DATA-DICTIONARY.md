# Data Dictionary

**Project:** PM Certification Practice Exam Simulator Platform  
**Version:** 1.0  
**Date:** 17 April 2026  
**Database:** MySQL 8.0 (InnoDB, utf8mb4)

---

## 1. users

User accounts for students, admins, and super admins.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique user identifier |
| email | VARCHAR(255) | NO | — | UQ | Login email, normalized to lowercase |
| full_name | VARCHAR(100) | NO | — | — | Display name |
| password_hash | VARCHAR(255) | NO | — | — | bcrypt hash (cost factor 12) |
| role | ENUM('student','admin','super_admin') | NO | 'student' | IDX | User role for access control |
| status | ENUM('active','suspended') | NO | 'active' | — | Account status |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Registration timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 2. products

Purchasable exam packs/bundles.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique product identifier |
| slug | VARCHAR(255) | NO | — | UQ | URL-safe identifier for routing |
| title | VARCHAR(255) | NO | — | — | Product display name |
| description | TEXT | YES | NULL | — | Rich product description |
| category | VARCHAR(100) | YES | NULL | — | Certification type (PMP, CAPM, etc.) |
| difficulty | VARCHAR(50) | YES | NULL | — | Difficulty label (Beginner, Intermediate, Advanced) |
| price_myr | DECIMAL(10,2) | NO | — | — | Price in Malaysian Ringgit |
| access_days | INT | NO | — | — | Days of access granted after purchase |
| visibility | ENUM('draft','published','archived') | NO | 'draft' | IDX | Publication status |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Creation timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 3. exams

Individual exams within a product.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique exam identifier |
| product_id | BIGINT UNSIGNED | NO | — | FK→products.id | Parent product |
| slug | VARCHAR(255) | NO | — | UQ | URL-safe identifier |
| title | VARCHAR(255) | NO | — | — | Exam display name |
| time_limit_minutes | INT | NO | — | — | Time allowed for timed exam mode |
| pass_threshold | INT | NO | — | — | Minimum passing percentage |
| status | ENUM('draft','published') | NO | 'draft' | — | Publication status |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Creation timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 4. questions

Multiple-choice questions belonging to an exam.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique question identifier |
| exam_id | BIGINT UNSIGNED | NO | — | FK→exams.id | Parent exam |
| prompt | TEXT | NO | — | — | Question text/stem |
| option_a | TEXT | NO | — | — | Answer choice A |
| option_b | TEXT | NO | — | — | Answer choice B |
| option_c | TEXT | NO | — | — | Answer choice C |
| option_d | TEXT | NO | — | — | Answer choice D |
| correct_answer | CHAR(1) | NO | — | — | Correct option: A, B, C, or D |
| explanation | TEXT | YES | NULL | — | Explanation shown after answering |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Creation timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 5. orders

Purchase orders linking users to products.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique order identifier |
| user_id | BIGINT UNSIGNED | NO | — | FK→users.id | Purchasing user |
| product_id | BIGINT UNSIGNED | NO | — | FK→products.id | Purchased product |
| status | ENUM('pending','paid','failed','refunded') | NO | 'pending' | IDX | Payment status |
| total_amount | DECIMAL(10,2) | NO | — | — | Final amount after discounts |
| gateway_provider | VARCHAR(50) | YES | NULL | — | Payment provider name (e.g., 'toyyibpay') |
| gateway_bill_code | VARCHAR(100) | YES | NULL | — | Provider-specific bill/transaction code |
| gateway_reference | VARCHAR(255) | YES | NULL | — | Provider transaction reference |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Order creation timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last status change |

---

## 6. payment_events

Immutable log of payment gateway callback events.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique event identifier |
| event_key | VARCHAR(255) | NO | — | UQ | Idempotency key (e.g., `toyyibpay:{billcode}:{status}`) |
| order_id | BIGINT UNSIGNED | NO | — | FK→orders.id | Related order |
| provider | VARCHAR(50) | NO | — | — | Gateway name |
| event_type | VARCHAR(50) | NO | — | — | Event type (payment_success, payment_failed, etc.) |
| payload | JSON | YES | NULL | — | Full raw callback payload for audit |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Event timestamp |

---

## 7. enrollments

Time-bounded access grants linking users to products.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique enrollment identifier |
| user_id | BIGINT UNSIGNED | NO | — | FK→users.id | Enrolled student |
| product_id | BIGINT UNSIGNED | NO | — | FK→products.id | Accessible product |
| starts_at | TIMESTAMP | NO | — | — | Access start time (usually payment time) |
| expires_at | TIMESTAMP | NO | — | IDX | Access expiry time |
| status | ENUM('active','expired','revoked') | NO | 'active' | — | Enrollment status |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Creation timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 8. attempts

Exam attempt records with answers and scoring.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | CHAR(36) | NO | UUID() | PK | UUID primary key |
| user_id | BIGINT UNSIGNED | NO | — | FK→users.id | Student taking the exam |
| exam_id | BIGINT UNSIGNED | NO | — | FK→exams.id | Target exam |
| status | ENUM('in_progress','submitted') | NO | 'in_progress' | IDX | Attempt lifecycle state |
| training_mode | TINYINT(1) | NO | 0 | — | 1=study mode, 0=timed exam |
| answers_json | JSON | YES | NULL | — | `{"questionId": "A"}` answer map |
| marked_for_review_json | JSON | YES | NULL | — | `[questionId, ...]` flagged questions |
| score | INT | YES | NULL | — | Correct answer count (set on submit) |
| total_questions | INT | YES | NULL | — | Total questions in exam (set on submit) |
| started_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Attempt start time |
| submitted_at | TIMESTAMP | YES | NULL | — | Submission time |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 9. audit_logs

Immutable audit trail for administrative actions.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique log entry |
| actor_user_id | BIGINT UNSIGNED | YES | NULL | FK→users.id | Admin who performed the action |
| action_key | VARCHAR(100) | NO | — | IDX | Action identifier (e.g., `user.suspend`, `order.reconcile`) |
| entity_type | VARCHAR(50) | NO | — | IDX | Target entity type (user, order, enrollment, etc.) |
| entity_id | VARCHAR(50) | NO | — | — | Target entity ID |
| reason | TEXT | YES | NULL | — | Admin-provided reason/justification |
| payload | JSON | YES | NULL | — | Additional context (before/after values, etc.) |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Action timestamp |

---

## 10. auth_sessions

Active JWT refresh token sessions.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | CHAR(36) | NO | UUID() | PK | Session UUID |
| user_id | BIGINT UNSIGNED | NO | — | FK→users.id, IDX | Session owner |
| refresh_token_hash | CHAR(64) | NO | — | IDX | SHA-256 hash of refresh token |
| user_agent | VARCHAR(512) | YES | NULL | — | Client browser/device string |
| ip_address | VARCHAR(45) | YES | NULL | — | Client IP (IPv4 or IPv6) |
| issued_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Session creation time |
| expires_at | TIMESTAMP | NO | — | — | Session expiry time |
| revoked_at | TIMESTAMP | YES | NULL | — | Revocation timestamp (NULL = active) |

---

## 11. user_session_policies

Per-user overrides for session management defaults.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| user_id | BIGINT UNSIGNED | NO | — | PK, FK→users.id | User (1:1 relationship) |
| max_sessions | INT | NO | 5 | — | Maximum concurrent sessions |
| refresh_ttl_days | INT | NO | 7 | — | Refresh token TTL in days |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 12. password_reset_tokens

Secure one-time password reset tokens.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | CHAR(36) | NO | UUID() | PK | Token UUID |
| user_id | BIGINT UNSIGNED | NO | — | FK→users.id | Target user |
| token_hash | CHAR(64) | NO | — | UQ | SHA-256 hash of the reset token |
| expires_at | TIMESTAMP | NO | — | — | Token expiry (1 hour from creation) |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Creation timestamp |
| consumed_at | TIMESTAMP | YES | NULL | — | When token was used (NULL = unused) |

---

## 13. question_import_batches

CSV import staging records for question bulk imports.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | CHAR(36) | NO | UUID() | PK | Batch UUID |
| exam_id | BIGINT UNSIGNED | NO | — | FK→exams.id | Target exam |
| created_by | BIGINT UNSIGNED | NO | — | FK→users.id | Admin who uploaded |
| csv_text | LONGTEXT | NO | — | — | Raw CSV content for audit |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Upload timestamp |
| applied_at | TIMESTAMP | YES | NULL | — | When batch was applied (NULL = staged only) |

---

## 14. question_versions

Historical snapshots of questions for version tracking and rollback.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Version record ID |
| exam_id | BIGINT UNSIGNED | NO | — | FK→exams.id | Parent exam |
| import_batch_id | CHAR(36) | YES | NULL | FK→question_import_batches.id | Source import batch |
| version_no | INT | NO | — | — | Version sequence number |
| question_order | INT | NO | — | — | Position in exam |
| prompt | TEXT | NO | — | — | Question text at this version |
| option_a | TEXT | NO | — | — | Option A at this version |
| option_b | TEXT | NO | — | — | Option B at this version |
| option_c | TEXT | NO | — | — | Option C at this version |
| option_d | TEXT | NO | — | — | Option D at this version |
| correct_answer | CHAR(1) | NO | — | — | Correct option at this version |
| explanation | TEXT | YES | NULL | — | Explanation at this version |
| created_by | BIGINT UNSIGNED | NO | — | FK→users.id | Admin who created this version |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Version creation timestamp |

---

## 15. vouchers

Discount codes with configurable rules and limits.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Unique voucher ID |
| code | VARCHAR(50) | NO | — | UQ | Redemption code (case-insensitive lookup) |
| type | ENUM('fixed','percentage') | NO | — | — | Discount type |
| amount | DECIMAL(10,2) | NO | — | — | Discount value (RM for fixed, % for percentage) |
| min_order | DECIMAL(10,2) | YES | NULL | — | Minimum order amount to apply |
| usage_limit | INT | YES | NULL | — | Max total redemptions (NULL = unlimited) |
| per_user_limit | INT | YES | NULL | — | Max redemptions per user (NULL = unlimited) |
| product_id | BIGINT UNSIGNED | YES | NULL | FK→products.id | Restrict to specific product (NULL = all) |
| valid_from | TIMESTAMP | YES | NULL | — | Validity start (NULL = immediately) |
| valid_until | TIMESTAMP | YES | NULL | — | Validity end (NULL = never expires) |
| status | ENUM('active','disabled') | NO | 'active' | — | Voucher status |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Creation timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 16. voucher_redemptions

Records of voucher usage tied to orders.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Redemption record ID |
| voucher_id | BIGINT UNSIGNED | NO | — | FK→vouchers.id | Redeemed voucher |
| user_id | BIGINT UNSIGNED | NO | — | FK→users.id | User who redeemed |
| order_id | BIGINT UNSIGNED | NO | — | FK→orders.id | Associated order |
| discount_amount | DECIMAL(10,2) | NO | — | — | Actual discount applied |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Redemption timestamp |

---

## 17. categories

Classification taxonomy for products and questions.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| id | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK | Category ID |
| slug | VARCHAR(100) | NO | — | UQ | URL-safe identifier |
| name | VARCHAR(100) | NO | — | — | Display name |
| description | TEXT | YES | NULL | — | Category description |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | — | Creation timestamp |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

---

## 18. app_settings

Key-value application configuration store.

| Column | Type | Null | Default | Key | Description |
|--------|------|------|---------|-----|-------------|
| setting_key | VARCHAR(100) | NO | — | PK | Configuration key identifier |
| setting_value | TEXT | YES | NULL | — | Configuration value |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | — | Last modification |

**Known Keys:**

| Key | Description | Example Value |
|-----|-------------|---------------|
| site_name | Platform display name | "PM Practice Exam" |
| maintenance_mode | Enable maintenance page | "false" |
| default_access_days | Default enrollment duration | "90" |

---

## Enum Reference

| Table | Column | Values |
|-------|--------|--------|
| users | role | `student`, `admin`, `super_admin` |
| users | status | `active`, `suspended` |
| products | visibility | `draft`, `published`, `archived` |
| exams | status | `draft`, `published` |
| orders | status | `pending`, `paid`, `failed`, `refunded` |
| enrollments | status | `active`, `expired`, `revoked` |
| attempts | status | `in_progress`, `submitted` |
| vouchers | type | `fixed`, `percentage` |
| vouchers | status | `active`, `disabled` |

---

## Index Summary

| Table | Index | Columns | Type |
|-------|-------|---------|------|
| users | PRIMARY | id | PK |
| users | idx_users_email | email | UNIQUE |
| products | PRIMARY | id | PK |
| products | idx_products_slug | slug | UNIQUE |
| exams | PRIMARY | id | PK |
| exams | idx_exams_slug | slug | UNIQUE |
| exams | idx_exams_product_id | product_id | FK |
| questions | idx_questions_exam_id | exam_id | FK |
| orders | idx_orders_user_id | user_id | FK |
| orders | idx_orders_product_id | product_id | FK |
| orders | idx_orders_status | status | INDEX |
| payment_events | idx_pe_event_key | event_key | UNIQUE |
| payment_events | idx_pe_order_id | order_id | FK |
| enrollments | idx_enroll_user_product | user_id, product_id | COMPOSITE |
| enrollments | idx_enroll_expires | expires_at | INDEX |
| attempts | idx_attempts_user_exam | user_id, exam_id | COMPOSITE |
| auth_sessions | idx_sessions_user_id | user_id | FK |
| auth_sessions | idx_sessions_token_hash | refresh_token_hash | INDEX |
| audit_logs | idx_audit_actor | actor_user_id | FK |
| audit_logs | idx_audit_action | action_key | INDEX |
| vouchers | idx_vouchers_code | code | UNIQUE |
| voucher_redemptions | idx_vr_voucher_user | voucher_id, user_id | COMPOSITE |
