# Functional Specification Document (FSD)

**Project:** PM Certification Practice Exam Simulator Platform  
**Version:** 1.0  
**Date:** 17 April 2026  
**Reference:** 01-BRD.md, 02-ERD.md, 03-USER-FLOWS.md

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Module 1 — Authentication & Account Management](#2-module-1--authentication--account-management)
3. [Module 2 — Checkout & Payment](#3-module-2--checkout--payment)
4. [Module 3 — Exam Simulator Engine](#4-module-3--exam-simulator-engine)
5. [Module 4 — Student Portal](#5-module-4--student-portal)
6. [Module 5 — Admin Back-Office](#6-module-5--admin-back-office)
7. [Module 6 — Database & Infrastructure](#7-module-6--database--infrastructure)

---

## 1. Introduction

This document specifies the detailed functional behaviour of every feature in the PM Certification Practice Exam Simulator Platform. Each feature is described by its inputs, processing logic, outputs, business rules, and error handling.

### Conventions

| Symbol | Meaning |
|--------|---------|
| **M** | Must-have (MVP) |
| **S** | Should-have |
| **C** | Could-have (Phase 2) |

---

## 2. Module 1 — Authentication & Account Management

### 2.1 User Registration

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/auth/register` |
| **Priority** | M |
| **Actors** | Guest |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| email | string | Required, valid email format, max 255 chars, unique in DB |
| full_name | string | Required, 2–100 chars |
| password | string | Required, min 8 chars |

**Processing:**
1. Validate all inputs via Zod schema
2. Check email uniqueness (case-insensitive)
3. Hash password with bcrypt (cost factor 12)
4. Insert into `users` table with role=`student`, status=`active`

**Output (201):**
```json
{
  "user": { "id": 1, "email": "...", "full_name": "...", "role": "student" }
}
```

**Error Cases:**
| Code | Condition | Response |
|------|-----------|----------|
| 400 | Validation failure | `{ "error": "Validation error", "details": [...] }` |
| 409 | Email already exists | `{ "error": "Email already registered" }` |

**Business Rules:**
- Passwords are stored as bcrypt hashes; never logged or returned in API responses
- Email is normalized to lowercase before storage
- Account is immediately active upon registration

---

### 2.2 User Login

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/auth/login` |
| **Priority** | M |
| **Actors** | Registered user |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| email | string | Required, valid email |
| password | string | Required |

**Processing:**
1. Rate-limit check: max 10 requests per 60 seconds per IP (Redis)
2. Look up user by email (case-insensitive)
3. Verify password against bcrypt hash
4. Check user status is `active` (not `suspended`)
5. Check concurrent session count against `user_session_policies.max_sessions`; if exceeded, revoke oldest session
6. Generate access token (JWT, short-lived ~15min)
7. Generate refresh token (random, hashed with SHA-256 for DB storage)
8. Insert into `auth_sessions` with user_agent, ip_address, expires_at
9. Set both tokens as HttpOnly, Secure, SameSite=Strict cookies

**Output (200):**
```json
{
  "user": { "id": 1, "email": "...", "full_name": "...", "role": "student" }
}
```

**Error Cases:**
| Code | Condition | Response |
|------|-----------|----------|
| 401 | Invalid credentials | `{ "error": "Invalid email or password" }` |
| 403 | Account suspended | `{ "error": "Account is suspended" }` |
| 429 | Rate limited | `{ "error": "Too many attempts. Try again later." }` |

**Business Rules:**
- Error messages must NOT reveal whether the email exists (same message for bad email vs bad password)
- Refresh token is stored as SHA-256 hash in DB (never plaintext)
- Access token contains: user_id, role, session_id

---

### 2.3 Token Refresh

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/auth/refresh` |
| **Priority** | M |
| **Actors** | Authenticated user (with expired access token) |

**Processing:**
1. Extract refresh token from cookie
2. SHA-256 hash the token
3. Look up `auth_sessions` by hash; verify not revoked, not expired
4. Generate new access token + new refresh token (rotation)
5. Update session record with new hash
6. Set new cookies

**Error Cases:**
| Code | Condition | Response |
|------|-----------|----------|
| 401 | Missing/invalid/expired refresh token | Clear cookies, return `{ "error": "Session expired" }` |

---

### 2.4 Logout

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/auth/logout` |
| **Priority** | M |

**Processing:**
1. Extract refresh token from cookie
2. Mark session as revoked (`revoked_at = NOW()`)
3. Clear access and refresh token cookies

**Output:** `204 No Content`

---

### 2.5 Forgot Password

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/auth/forgot-password` |
| **Priority** | M |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| email | string | Required, valid email |

**Processing:**
1. Look up user by email
2. If found: generate random token, store SHA-256 hash in `password_reset_tokens` with 1hr expiry
3. Send email with reset link containing the plain token
4. Always return success (prevent email enumeration)

**Output (200):**
```json
{ "message": "If that email is registered, a reset link has been sent." }
```

---

### 2.6 Reset Password

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/auth/reset-password` |
| **Priority** | M |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| token | string | Required (from URL) |
| password | string | Required, min 8 chars |

**Processing:**
1. SHA-256 hash the provided token
2. Look up `password_reset_tokens` by hash
3. Verify not expired and not consumed
4. Update user's password_hash
5. Mark token as consumed
6. Revoke all active auth sessions for that user

---

### 2.7 Get Current User

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `GET /api/auth/me` |
| **Priority** | M |

**Processing:** Return current authenticated user from JWT claims

**Output (200):**
```json
{
  "user": { "id": 1, "email": "...", "full_name": "...", "role": "student" }
}
```

---

### 2.8 Update Profile

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `PATCH /api/auth/profile` |
| **Priority** | M |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| full_name | string | Optional, 2–100 chars |
| email | string | Optional, unique |

---

### 2.9 Change Password

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/auth/change-password` |
| **Priority** | M |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| current_password | string | Required |
| new_password | string | Required, min 8 chars |

**Processing:**
1. Verify current_password matches
2. Hash new_password with bcrypt
3. Update user record
4. Optionally revoke other sessions (configurable)

---

### 2.10 Session Management

| Attribute | Detail |
|-----------|--------|
| **Endpoints** | `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id` |
| **Priority** | M |

**GET — List Sessions:**
- Returns all active (non-revoked, non-expired) sessions for the user
- Each session shows: id, user_agent, ip_address, issued_at, expires_at, is_current

**DELETE — Revoke Session:**
- Sets `revoked_at = NOW()` on the specified session
- Cannot revoke session with ID matching the current session (use logout instead)

---

## 3. Module 2 — Checkout & Payment

### 3.1 Register & Pay (Combined Guest Flow)

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/checkout/register-and-pay` |
| **Priority** | M |
| **Actors** | Guest |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| email | string | Required, valid email |
| full_name | string | Required, 2–100 chars |
| password | string | Required, min 8 chars |
| product_id | number | Required, valid product |
| voucher_code | string | Optional |

**Processing:**
1. Validate inputs
2. Verify product exists and visibility = `published`
3. If user exists and is logged in → skip registration; else register new user
4. Create order (status=`pending`, total=product price)
5. If voucher_code: validate & apply discount (see §3.3 Voucher Apply)
6. If total > 0: create payment bill via gateway → return redirect URL
7. If total = 0: mark order as `paid`, create enrollment, return success

**Output (200):**
```json
{
  "orderId": 42,
  "paymentUrl": "https://dev.toyyibpay.com/abc123",
  "billCode": "abc123"
}
```

---

### 3.2 Payment Callback (Generic)

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/payments/callbacks/:provider` |
| **Priority** | M |
| **Actors** | Payment gateway (server-to-server) |

**Processing (ToyyibPay):**
1. Parse `application/x-www-form-urlencoded` body
2. Extract billcode, order_id, status_id, transaction_id
3. Generate idempotency key: `toyyibpay:{billcode}:{status_id}`
4. Check `payment_events` for duplicate key → skip if exists
5. Insert `payment_events` record
6. If status_id = 1 (success): update order status=`paid`
7. Create enrollment: starts_at=NOW(), expires_at=NOW()+product.access_days
8. If status_id = 3 (failed): update order status=`failed`

**Output:** `200 OK` (plain text "OK")

**Idempotency:** Duplicate callbacks with same event_key are silently ignored.

---

### 3.3 Voucher Validation & Apply

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/checkout/vouchers/apply` |
| **Priority** | S |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| code | string | Required |
| product_id | number | Required |
| user_id | number | Required (from auth) |

**Processing:**
1. Look up voucher by code (case-insensitive)
2. Validate: status=`active`, within valid_from/valid_until, usage_limit not exceeded
3. Check per_user_limit against `voucher_redemptions` count for this user
4. If product_id restriction: verify it matches
5. Calculate discount:
   - `fixed`: discount = min(voucher.amount, product.price)
   - `percentage`: discount = product.price × voucher.amount / 100
6. Return discount amount and new total

**Business Rules:**
- Discount cannot exceed product price (no negative totals)
- Voucher redemption record is created only when order is finalized

---

### 3.4 Order Status Polling

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `GET /api/checkout/orders/:id/status` |
| **Priority** | M |

**Output:**
```json
{
  "orderId": 42,
  "status": "paid",
  "enrollmentId": 15
}
```

**Usage:** Frontend polls this endpoint every 3 seconds after redirect back from payment gateway, for up to 20 attempts (60 seconds).

---

## 4. Module 3 — Exam Simulator Engine

### 4.1 Start Exam Attempt

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/exams/:examId/attempts` |
| **Priority** | M |
| **Actors** | Enrolled student |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| training_mode | boolean | Optional, default false |

**Processing:**
1. Verify user has active enrollment for the exam's product
2. Check exam status = `published`
3. Create attempt record (UUID primary key) with status=`in_progress`
4. Load all questions for the exam
5. Return attempt ID and questions (without correct_answer/explanation in exam mode)

**Business Rules:**
- In training mode (`training_mode=1`): correct_answer and explanation are included in response
- In exam mode: correct_answer and explanation are NOT returned until submission
- Multiple concurrent in-progress attempts for the same exam are allowed (prior ones can be resumed)
- Questions are shuffled per attempt using a deterministic seeded Fisher-Yates algorithm (mulberry32 PRNG seeded with attempt ID hash) — same order on resume

---

### 4.2 Save Answers (Auto-save)

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `PATCH /api/attempts/:id/answers` |
| **Priority** | M |

**Inputs:**

| Field | Type | Validation |
|-------|------|------------|
| answers | object | `{ "questionId": "A"|"B"|"C"|"D" }` |
| marked_for_review | array | `[questionId, ...]` |

**Processing:**
1. Verify attempt belongs to current user and status=`in_progress`
2. Merge provided answers into `answers_json` column
3. Update `marked_for_review_json`

**Business Rules:**
- Frontend debounces auto-save at 500ms after last interaction
- Explicit "Save" button also triggers this endpoint
- Partial saves are supported (only changed answers need to be sent)

---

### 4.3 Submit Attempt

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/attempts/:id/submit` |
| **Priority** | M |

**Processing:**
1. Verify attempt belongs to current user and status=`in_progress`
2. Parse answers_json and compare each with questions.correct_answer
3. Calculate score (correct count) and total_questions
4. Determine pass/fail against exam.pass_threshold
5. Update attempt: status=`submitted`, score, total_questions, submitted_at

**Output:**
```json
{
  "score": 65,
  "total": 80,
  "percentage": 81.25,
  "passed": true,
  "pass_threshold": 75,
  "review": [
    {
      "question_id": 1,
      "selected": "A",
      "correct": "B",
      "is_correct": false,
      "explanation": "..."
    }
  ]
}
```

---

### 4.4 Resume Attempt

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `GET /api/attempts/:id` |
| **Priority** | S |

**Processing:**
1. Verify attempt belongs to current user
2. If status=`in_progress`: return questions with saved answers and marked_for_review
3. If status=`submitted`: return full review with correct answers and explanations

---

### 4.5 Timer Behaviour

| Attribute | Detail |
|-----------|--------|
| **Type** | Frontend logic |
| **Priority** | M |

**Specification:**
- Timer starts from `attempt.started_at` + `exam.time_limit_minutes`
- On resume, remaining time is recalculated from `started_at` + `time_limit` — time already elapsed is subtracted
- Countdown displayed as MM:SS in the exam header
- When ≤ 5 minutes remaining: timer text turns red, visual pulse animation
- When timer reaches 00:00: auto-submit via PATCH then POST submit
- Timer is validated server-side: if `submitted_at - started_at > time_limit + 30s grace`, flag the attempt

---

### 4.6 Question Navigation

| Type | Specification |
|------|---------------|
| **Previous/Next** | Arrow buttons at bottom of question card |
| **Jump-to Grid** | Numbered grid showing all questions; colors: grey (unanswered), green (answered), yellow (flagged), blue (current) |
| **Quick filter** | Toggle to show only flagged questions in the grid |
| **Strikethrough** | Click an option label to toggle line-through style (visual aid, not saved to server) |

---

### 4.8 Auto-Next Behaviour

| Attribute | Detail |
|-----------|--------|
| **Type** | Frontend logic |
| **Priority** | C |

**Specification:**
- After a student selects an answer (radio button click), the simulator automatically advances to the next question after a 350ms delay
- In training mode: auto-next is disabled (student must manually proceed to see feedback first)
- If the student is on the last question, auto-next does not trigger
- The `autoNextRef` ref ensures the feature can be toggled in the future without re-rendering

---

### 4.9 Anti-Cheating Measures

| Attribute | Detail |
|-----------|--------|
| **Type** | Frontend logic |
| **Priority** | S |

**Specification:**
- **Copy/Cut/Paste blocked**: `copy`, `cut`, and `paste` events are intercepted and `preventDefault()` is called during active attempts
- **Right-click blocked**: `contextmenu` event is intercepted and blocked during active attempts
- **Tab-switch detection**: `visibilitychange` event listener tracks when the user leaves the exam tab
  - A counter increments each time the tab becomes hidden
  - When the user returns (tab becomes visible), a Bootstrap toast warning is shown: "You left the exam tab. Tab switches are being tracked."
  - The tab-switch count is stored in component state but not currently persisted to the server

---

### 4.10 Auto-Resume In-Progress Attempt

| Attribute | Detail |
|-----------|--------|
| **Type** | Frontend + API |
| **Priority** | S |

**Specification:**
- When a student navigates to an exam page (`/exams/:slug`), the frontend calls `GET /api/exams/:slug/in-progress`
- If an in-progress attempt exists, the simulator automatically loads it:
  1. Restores saved answers from `answers_json`
  2. Restores `marked_for_review` flags
  3. Recalculates remaining timer from `started_at` + `time_limit`
  4. Sets training mode based on the attempt's `training_mode` field
- If no in-progress attempt exists, the exam lobby is shown normally
- The `loadAttemptIntoState()` helper function handles all state restoration

---

### 4.11 Refresh Token Mutex (Concurrent Request Handling)

| Attribute | Detail |
|-----------|--------|
| **Type** | Frontend logic |
| **Priority** | M |

**Specification:**
- `browserApiFetch()` includes a mutex (singleton `refreshPromise`) to prevent multiple concurrent 401-triggered refresh token rotations
- When a request receives a 401, it checks if a refresh is already in progress
- If yes: it awaits the existing refresh promise and retries
- If no: it initiates the refresh and stores the promise so other concurrent requests can await it
- This prevents race conditions where multiple auto-save/fetch calls trigger competing refresh requests

---

### 4.12 Payment Verification (Gateway API Fallback)

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/checkout/orders/:id/verify` |
| **Priority** | S |
| **Actors** | Authenticated user (order owner) |

**Processing:**
1. Look up order by ID, verify it belongs to the current user
2. Verify order status is `pending`
3. Extract `bill_code` from order's payment_events
4. Call ToyyibPay `getBillTransactions` API with the bill code
5. If transaction found with status `1` (success): update order to `paid`, create enrollment
6. If transaction found with status `3` (failed): update order to `failed`
7. If no transaction or still pending: return current pending status

**Usage:** Called by the checkout result page when order status is `pending` after redirect from payment gateway — handles the case where ToyyibPay callback cannot reach localhost during development

---

### 4.7 Training Mode Differences

| Feature | Exam Mode | Training Mode |
|---------|-----------|---------------|
| Timer | Active | Hidden / inactive |
| Correct answer shown | After submit only | Immediately after answering |
| Explanation shown | After submit only | Immediately after answering |
| Score counted | Yes | Yes (for tracking) |
| Visual feedback | None per question | Green ✅ / Red ❌ per question |

---

## 5. Module 4 — Student Portal

### 5.1 Dashboard

| Attribute | Detail |
|-----------|--------|
| **Pages** | `/dashboard`, `/dashboard/exams`, `/dashboard/history`, `/dashboard/profile`, `/dashboard/orders` |
| **Priority** | M |

**Dashboard Home Displays:**
- Active subscriptions with exam name, expiry date, "Start Exam" button
- Summary cards: Total exams available, Completed attempts, In-progress attempts
- Smart summary: "Last test: [Exam Name], scored [X]%", "Area to work on: [weakest category]"
- Certification type filter dropdown
- When no active enrollments: "Take a Test", "Review Completed Tests", and "View My Performance" links are hidden; FAQ, Tutorial, and Manage Account remain visible

### 5.2 Exam History

- List of all past attempts: exam name, date, score, pass/fail badge
- Click to view detailed per-question review
- Sort by date (newest first)

### 5.3 Profile Settings

- Edit full_name, email
- Change password (requires current password)
- View and revoke active sessions

### 5.4 Order History

- List all orders with: date, product name, amount, payment status, gateway reference
- Click to view order details

---

## 6. Module 5 — Admin Back-Office

### 6.1 Admin Dashboard

**Overview Cards:**
- Total revenue (paid orders sum)
- Active subscriptions count
- Expiring soon (next 7 days)
- Failed payments count
- Today's new registrations

### 6.2 Product Management

| Operation | Specification |
|-----------|---------------|
| **List** | Paginated table with search, filter by visibility |
| **Create** | Form: slug, title, description, category, difficulty, price, access_days, visibility |
| **Edit** | Same form, pre-filled |
| **Visibility toggle** | Inline switch: draft ↔ published ↔ archived |

**Business Rules:**
- Slug must be URL-safe and unique
- Cannot delete a product that has orders or enrollments (archive instead)
- Price changes do not affect existing orders

### 6.3 Exam Management

| Operation | Specification |
|-----------|---------------|
| **List** | Nested under product; shows exam count per product |
| **Create** | Form: title, slug, time_limit_minutes, pass_threshold, status |
| **Edit** | Same form, pre-filled |
| **Delete** | Soft — set status=`draft` if no attempts exist; block if attempts exist |

### 6.4 Question Management

| Operation | Specification |
|-----------|---------------|
| **List** | Paginated table under exam; shows prompt preview, correct answer |
| **Create** | Form: prompt (rich text), option A–D, correct_answer, explanation |
| **Edit** | Same form; creates a new `question_versions` entry |
| **Delete** | Soft delete or hard delete if no attempts reference it |
| **CSV Import** | Upload CSV → parse → show diff preview → apply batch (creates `question_import_batches` + `question_versions`) |
| **CSV Export** | Download all questions for an exam as CSV |

**CSV Format:**
```
prompt,option_a,option_b,option_c,option_d,correct_answer,explanation
"What is...","Answer A","Answer B","Answer C","Answer D","B","Because..."
```

### 6.5 User Management

| Operation | Specification |
|-----------|---------------|
| **List** | Paginated table: name, email, role, status, created_at |
| **Search** | By name or email (LIKE query) |
| **View** | User detail with enrollments, attempts, orders |
| **Suspend/Reactivate** | Toggle status with audit reason (logged to audit_logs) |
| **Session Policy** | Set max_sessions and refresh_ttl_days per user |

### 6.6 Order Management

| Operation | Specification |
|-----------|---------------|
| **List** | Paginated: user, product, amount, status, gateway, date |
| **Filter** | By status, date range, product |
| **View** | Order detail with payment_events timeline |
| **Manual Reconcile** | Change order status to `paid` with required audit reason → triggers enrollment creation |

### 6.7 Enrollment Management

| Operation | Specification |
|-----------|---------------|
| **List** | Paginated: user, product, starts_at, expires_at, status |
| **Extend** | Set new expires_at with audit reason |
| **Revoke** | Set status=`revoked` with audit reason |

### 6.8 Voucher Management

| Operation | Specification |
|-----------|---------------|
| **List** | Table: code, type, amount, usage (count/limit), status, validity |
| **Create** | Form: code, type (fixed/percentage), amount, min_order, usage_limit, per_user_limit, product_id (optional), valid_from/until |
| **Edit** | Update limits, validity, status |
| **View Redemptions** | List of voucher_redemptions with user, order, discount_amount |

### 6.9 Category Management

| Operation | Specification |
|-----------|---------------|
| **List** | Simple table: name, slug, description |
| **Create** | Form: name, slug, description |
| **Edit** | Update name, description |

### 6.10 App Settings

- Key-value management for application configuration
- Examples: site_name, maintenance_mode, default_access_days

### 6.11 Audit Logs

| Attribute | Specification |
|-----------|---------------|
| **List** | Immutable log: actor, action, entity_type, entity_id, reason, timestamp |
| **Filter** | By actor, action_key, entity_type, date range |
| **Detail** | Expand to see full JSON payload |

**Audited Actions:**
- User suspend/reactivate
- Order manual reconciliation
- Enrollment extend/revoke
- Product/exam visibility changes
- Question import batches
- Voucher creation/status changes

### 6.12 Reporting

| Report | Specification |
|--------|---------------|
| **Sales Summary** | Revenue by period (daily/weekly/monthly), by product |
| **Enrollment Report** | Active/expired/revoked counts, expiring soon |
| **Attempt Statistics** | Pass rate by exam, average score, attempt count by period |
| **CSV Export** | Admin can download report data as CSV |

---

## 7. Module 6 — Database & Infrastructure

### 7.1 Database

- MySQL 8.0 with InnoDB engine
- UTF8MB4 character set for full Unicode support
- Foreign keys with CASCADE or RESTRICT as appropriate
- Indexes on all foreign keys and frequently queried columns

### 7.2 Caching

- Redis 7 for:
  - Rate limiting (sliding window per IP)
  - Session token blacklisting
  - Frequently accessed configuration (app_settings)
  - Exam question caching (invalidated on question CRUD)

### 7.3 API Architecture

- Express.js with modular route files (14 modules)
- Zod schema validation on all request bodies
- Centralized error handling middleware
- JWT authentication middleware with role-based guards
- CORS configuration for frontend origin

### 7.4 Frontend Architecture

- Next.js 15 with App Router
- Server-side rendering for public pages (SEO)
- Client-side interactivity for exam simulator
- Bootstrap 5 component library
- Cookie-based auth (HttpOnly, Secure)
