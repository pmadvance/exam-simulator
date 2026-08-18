# Entity Relationship Diagram (ERD)

**Project:** PM Certification Practice Exam Simulator Platform  
**Version:** 1.0  
**Date:** 17 April 2026  
**Tables:** 17 (including runtime-managed tables)

---

## ERD — Full Schema

```mermaid
erDiagram
    users ||--o{ orders : places
    users ||--o{ enrollments : has
    users ||--o{ attempts : takes
    users ||--o{ audit_logs : triggers
    users ||--o{ auth_sessions : owns
    users ||--o| user_session_policies : configured_by
    users ||--o{ voucher_redemptions : redeems
    users ||--o{ question_import_batches : creates
    users ||--o{ question_versions : authors

    products ||--o{ exams : contains
    products ||--o{ orders : purchased_via
    products ||--o{ enrollments : grants_access_to
    products ||--o| vouchers : restricted_to

    exams ||--o{ questions : has
    exams ||--o{ attempts : attempted_in
    exams ||--o{ question_import_batches : imports_to
    exams ||--o{ question_versions : versioned_for

    orders ||--o{ payment_events : receives
    orders ||--o{ voucher_redemptions : discounted_by

    vouchers ||--o{ voucher_redemptions : redeemed_as

    question_import_batches ||--o{ question_versions : produces

    users {
        BIGINT id PK
        VARCHAR email UK
        VARCHAR full_name
        VARCHAR password_hash
        ENUM role "student | admin | super_admin"
        ENUM status "active | suspended"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    products {
        BIGINT id PK
        VARCHAR slug UK
        VARCHAR title
        TEXT description
        VARCHAR category
        VARCHAR difficulty
        DECIMAL price_myr
        INT access_days
        ENUM visibility "draft | published | archived"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    exams {
        BIGINT id PK
        BIGINT product_id FK
        VARCHAR slug UK
        VARCHAR title
        INT time_limit_minutes
        INT pass_threshold
        ENUM status "draft | published"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    questions {
        BIGINT id PK
        BIGINT exam_id FK
        ENUM question_type "single_choice|multiple_response|true_false"
        TEXT prompt
        TEXT option_a
        TEXT option_b
        TEXT option_c
        TEXT option_d
        VARCHAR correct_answer "up to 10 chars, comma-sep for MR"
        TEXT explanation
        VARCHAR eco_domain
        VARCHAR performance_domain
        ENUM status "draft|published"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    orders {
        BIGINT id PK
        BIGINT user_id FK
        BIGINT product_id FK
        ENUM status "pending | paid | failed | refunded"
        DECIMAL total_amount
        VARCHAR gateway_provider
        VARCHAR gateway_bill_code
        VARCHAR gateway_reference
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    payment_events {
        BIGINT id PK
        VARCHAR event_key UK
        BIGINT order_id FK
        VARCHAR provider
        VARCHAR event_type
        JSON payload
        TIMESTAMP created_at
    }

    enrollments {
        BIGINT id PK
        BIGINT user_id FK
        BIGINT product_id FK
        TIMESTAMP starts_at
        TIMESTAMP expires_at
        ENUM status "active | expired | revoked"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    attempts {
        CHAR_36 id PK
        BIGINT user_id FK
        BIGINT exam_id FK
        ENUM status "in_progress | submitted"
        TINYINT training_mode
        JSON answers_json
        JSON marked_for_review_json
        INT score
        INT total_questions
        TIMESTAMP started_at
        TIMESTAMP submitted_at
        TIMESTAMP updated_at
    }

    audit_logs {
        BIGINT id PK
        BIGINT actor_user_id FK
        VARCHAR action_key
        VARCHAR entity_type
        VARCHAR entity_id
        TEXT reason
        JSON payload
        TIMESTAMP created_at
    }

    auth_sessions {
        CHAR_36 id PK
        BIGINT user_id FK
        CHAR refresh_token_hash
        VARCHAR user_agent
        VARCHAR ip_address
        TIMESTAMP issued_at
        TIMESTAMP expires_at
        TIMESTAMP revoked_at
    }

    user_session_policies {
        BIGINT user_id PK_FK
        INT max_sessions
        INT refresh_ttl_days
        TIMESTAMP updated_at
    }

    password_reset_tokens {
        CHAR_36 id PK
        BIGINT user_id FK
        CHAR token_hash UK
        TIMESTAMP expires_at
        TIMESTAMP created_at
        TIMESTAMP consumed_at
    }

    question_import_batches {
        CHAR_36 id PK
        BIGINT exam_id FK
        BIGINT created_by FK
        LONGTEXT csv_text
        TIMESTAMP created_at
        TIMESTAMP applied_at
    }

    question_versions {
        BIGINT id PK
        BIGINT exam_id FK
        CHAR_36 import_batch_id FK
        INT version_no
        INT question_order
        TEXT prompt
        TEXT option_a
        TEXT option_b
        TEXT option_c
        TEXT option_d
        CHAR correct_answer
        TEXT explanation
        BIGINT created_by FK
        TIMESTAMP created_at
    }

    vouchers {
        BIGINT id PK
        VARCHAR code UK
        ENUM type "fixed | percentage"
        DECIMAL amount
        DECIMAL min_order
        INT usage_limit
        INT per_user_limit
        BIGINT product_id FK
        TIMESTAMP valid_from
        TIMESTAMP valid_until
        ENUM status "active | disabled"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    voucher_redemptions {
        BIGINT id PK
        BIGINT voucher_id FK
        BIGINT user_id FK
        BIGINT order_id FK
        DECIMAL discount_amount
        TIMESTAMP created_at
    }

    categories {
        BIGINT id PK
        VARCHAR slug UK
        VARCHAR name
        TEXT description
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    app_settings {
        VARCHAR setting_key PK
        TEXT setting_value
        TIMESTAMP updated_at
    }
```

---

## Table Summary

| # | Table | Records Relationship | Description |
|---|-------|---------------------|-------------|
| 1 | users | Root entity | Student, admin, and super_admin accounts |
| 2 | products | Root entity | Exam pack products with pricing and access duration |
| 3 | exams | Belongs to product | Individual exams within a product pack |
| 4 | questions | Belongs to exam | Multiple-choice questions with explanations |
| 5 | orders | Links user → product | Purchase orders with payment status tracking |
| 6 | payment_events | Belongs to order | Idempotent payment callback event log |
| 7 | enrollments | Links user → product | Time-bounded access grants |
| 8 | attempts | Links user → exam | Exam attempt records with answers and scores |
| 9 | audit_logs | Links to user (actor) | Immutable audit trail for admin actions |
| 10 | auth_sessions | Belongs to user | JWT refresh token sessions with revocation |
| 11 | user_session_policies | 1:1 with user | Per-user session limits and TTL overrides |
| 12 | password_reset_tokens | Belongs to user | Secure one-time password reset tokens |
| 13 | question_import_batches | Links exam → user | CSV import staging records |
| 14 | question_versions | Links exam → batch | Historical question snapshots for rollback |
| 15 | vouchers | Optional link to product | Discount codes with usage rules |
| 16 | voucher_redemptions | Links voucher → user → order | Voucher usage records |
| 17 | categories | Standalone | Question/product classification |
| 18 | app_settings | Standalone | Key-value application configuration |

---

## Key Foreign Key Constraints

| Child Table | Column | Parent Table | Column |
|-------------|--------|-------------|--------|
| exams | product_id | products | id |
| questions | exam_id | exams | id |
| orders | user_id | users | id |
| orders | product_id | products | id |
| payment_events | order_id | orders | id |
| enrollments | user_id | users | id |
| enrollments | product_id | products | id |
| attempts | user_id | users | id |
| attempts | exam_id | exams | id |
| audit_logs | actor_user_id | users | id |
| auth_sessions | user_id | users | id |
| user_session_policies | user_id | users | id |
| password_reset_tokens | user_id | users | id |
| question_import_batches | exam_id | exams | id |
| question_import_batches | created_by | users | id |
| question_versions | exam_id | exams | id |
| question_versions | import_batch_id | question_import_batches | id |
| question_versions | created_by | users | id |
| vouchers | product_id | products | id |
| voucher_redemptions | voucher_id | vouchers | id |
| voucher_redemptions | user_id | users | id |
| voucher_redemptions | order_id | orders | id |
