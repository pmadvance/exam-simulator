# API Specification

**Project:** PM Certification Practice Exam Simulator Platform  
**Version:** 1.0  
**Date:** 17 April 2026  
**Base URL:** `https://{host}/api`  
**Auth:** Cookie-based JWT (HttpOnly, Secure, SameSite=Strict)  
**Validation:** Zod schemas on all request bodies

---

## Auth Levels

| Level | Symbol | Description |
|-------|--------|-------------|
| Public | 🔓 | No authentication required |
| Student | 🔒 | Valid JWT, role = student or admin |
| Admin | 🔑 | Valid JWT, role = admin or super_admin |
| Server | 🖥️ | Server-to-server callback (no JWT) |

---

## 1. Authentication (`auth.ts`)

### POST /auth/register 🔓

Register a new student account.

| Parameter | Location | Type | Required | Validation |
|-----------|----------|------|----------|------------|
| email | body | string | ✅ | Valid email, max 255 |
| full_name | body | string | ✅ | 2–100 chars |
| password | body | string | ✅ | Min 8 chars |

**Response 201:**
```json
{ "user": { "id": 1, "email": "a@b.com", "full_name": "Test", "role": "student" } }
```

**Errors:** 400 (validation), 409 (email exists)

---

### POST /auth/login 🔓

Login with credentials. Sets access + refresh cookies.

| Parameter | Location | Type | Required |
|-----------|----------|------|----------|
| email | body | string | ✅ |
| password | body | string | ✅ |

**Response 200:**
```json
{ "user": { "id": 1, "email": "a@b.com", "full_name": "Test", "role": "student" } }
```

**Cookies Set:** `access_token` (15min), `refresh_token` (7d or per policy)  
**Errors:** 401 (bad credentials), 403 (suspended), 429 (rate limited)

---

### POST /auth/refresh 🔒

Rotate access and refresh tokens.

**Request:** Refresh token from cookie  
**Response 200:** Sets new cookies  
**Errors:** 401 (invalid/expired/revoked)

---

### POST /auth/logout 🔒

Revoke current session, clear cookies.

**Response:** 204 No Content

---

### GET /auth/me 🔒

Get current authenticated user.

**Response 200:**
```json
{ "user": { "id": 1, "email": "...", "full_name": "...", "role": "student" } }
```

---

### PATCH /auth/profile 🔒

Update current user profile.

| Parameter | Location | Type | Required |
|-----------|----------|------|----------|
| full_name | body | string | ❌ |
| email | body | string | ❌ |

**Response 200:** Updated user object  
**Errors:** 409 (email taken)

---

### POST /auth/change-password 🔒

| Parameter | Location | Type | Required |
|-----------|----------|------|----------|
| current_password | body | string | ✅ |
| new_password | body | string | ✅ |

**Response 200:** `{ "message": "Password updated" }`  
**Errors:** 401 (wrong current password)

---

### POST /auth/forgot-password 🔓

| Parameter | Location | Type | Required |
|-----------|----------|------|----------|
| email | body | string | ✅ |

**Response 200:** `{ "message": "If that email is registered, a reset link has been sent." }`

---

### POST /auth/reset-password 🔓

| Parameter | Location | Type | Required |
|-----------|----------|------|----------|
| token | body | string | ✅ |
| password | body | string | ✅ |

**Response 200:** `{ "message": "Password has been reset" }`  
**Errors:** 400 (invalid/expired token)

---

### GET /auth/sessions 🔒

List current user's active sessions.

**Response 200:**
```json
{
  "sessions": [
    { "id": "uuid", "user_agent": "...", "ip_address": "...", "issued_at": "...", "is_current": true }
  ]
}
```

---

### DELETE /auth/sessions/:id 🔒

Revoke a specific session.

**Response 200:** `{ "message": "Session revoked" }`  
**Errors:** 404 (not found), 400 (cannot revoke current session)

---

## 2. Products (`products.ts`)

### GET /products 🔓

List products. Public sees published only; admin sees all.

| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| page | query | number | Default 1 |
| limit | query | number | Default 20 |
| visibility | query | string | Filter: draft/published/archived |
| search | query | string | Search title |

**Response 200:**
```json
{
  "products": [...],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### GET /products/:idOrSlug 🔓

Get a single product by ID or slug.

**Response 200:** Product object with exams array  
**Errors:** 404

---

### POST /products 🔑

Create a new product.

| Parameter | Type | Required |
|-----------|------|----------|
| slug | string | ✅ |
| title | string | ✅ |
| description | string | ❌ |
| category | string | ❌ |
| difficulty | string | ❌ |
| price_myr | number | ✅ |
| access_days | number | ✅ |
| visibility | enum | ❌ (default: draft) |

**Response 201:** Created product  
**Errors:** 400, 409 (slug conflict)

---

### PATCH /products/:id 🔑

Update a product.

**Response 200:** Updated product

---

## 3. Exams (`exams.ts`)

### GET /exams 🔒

List exams (filterable by product_id).

| Parameter | Location | Type |
|-----------|----------|------|
| product_id | query | number |

---

### GET /exams/:idOrSlug 🔒

Get exam with question count.

---

### GET /exams/:slug/in-progress 🔒

Get the latest in-progress attempt for the current user on this exam.

**Response 200 (attempt exists):**
```json
{
  "attempt": {
    "id": "uuid",
    "status": "in_progress",
    "started_at": "2026-04-20T10:00:00Z",
    "training_mode": false,
    "answers_json": { "1": "A", "3": "C" },
    "marked_for_review_json": [1, 5]
  },
  "questions": [{ "id": 1, "prompt": "...", "option_a": "...", ... }],
  "exam": { "time_limit_minutes": 60 }
}
```

**Response 200 (no in-progress attempt):**
```json
{ "attempt": null }
```

**Usage:** Called by the exam simulator on page load to auto-resume an in-progress attempt.

---

### POST /exams 🔑

Create exam under a product.

| Parameter | Type | Required |
|-----------|------|----------|
| product_id | number | ✅ |
| title | string | ✅ |
| slug | string | ✅ |
| time_limit_minutes | number | ✅ |
| pass_threshold | number | ✅ |
| status | enum | ❌ (default: draft) |

---

### PATCH /exams/:id 🔑

Update exam settings.

---

## 4. Questions (`questions.ts`)

### GET /exams/:examId/questions 🔒

List questions for an exam. Admin sees all fields; student sees only during active attempt.

---

### POST /exams/:examId/questions 🔑

Create a single question.

| Parameter | Type | Required |
|-----------|------|----------|
| prompt | string | ✅ |
| option_a | string | ✅ |
| option_b | string | ✅ |
| option_c | string | ✅ |
| option_d | string | ✅ |
| correct_answer | enum(A,B,C,D) | ✅ |
| explanation | string | ❌ |

---

### PATCH /questions/:id 🔑

Update a question. Creates version entry.

---

### DELETE /questions/:id 🔑

Delete a question (blocked if referenced in submitted attempts).

---

### POST /exams/:examId/questions/import 🔑

Bulk import questions from CSV.

| Parameter | Type | Required |
|-----------|------|----------|
| csv_text | string | ✅ |

**Response 200:**
```json
{ "imported": 50, "batch_id": "uuid", "questions": [...] }
```

**Errors:** 400 (validation errors with row details)

---

### GET /exams/:examId/questions/export 🔑

Export questions as CSV download.

**Response:** `text/csv` with Content-Disposition header

---

### GET /exams/:examId/questions/versions 🔑

List question version history for an exam.

---

## 5. Attempts (`attempts.ts`)

### POST /exams/:examId/attempts 🔒

Start a new exam attempt.

| Parameter | Type | Required |
|-----------|------|----------|
| training_mode | boolean | ❌ (default: false) |

**Response 201:**
```json
{
  "attempt": { "id": "uuid", "status": "in_progress", "started_at": "..." },
  "questions": [{ "id": 1, "prompt": "...", "option_a": "...", ... }]
}
```

**Note:** In exam mode, `correct_answer` and `explanation` are omitted from questions. Questions are shuffled per-attempt using a deterministic seeded Fisher-Yates algorithm.

---

### GET /attempts/:id/questions 🔒

Get question prompts for an active in-progress attempt.

**Response 200:**
```json
{
  "questions": [{ "id": 1, "prompt": "...", "option_a": "...", ... }]
}
```

**Note:** In exam mode, `correct_answer` and `explanation` are omitted. Questions are returned in the same shuffled order as when the attempt was started.

---

### GET /attempts/:id 🔒

Get attempt with questions and answers (for resume or review).

---

### PATCH /attempts/:id/answers 🔒

Save answers and flags.

| Parameter | Type | Required |
|-----------|------|----------|
| answers | object | ❌ |
| marked_for_review | array | ❌ |

---

### POST /attempts/:id/submit 🔒

Submit attempt for scoring.

**Response 200:**
```json
{
  "score": 142,
  "total": 180,
  "percentage": 78.89,
  "passed": true,
  "pass_threshold": 75,
  "review": [...]
}
```

---

## 6. Enrollments (`enrollments.ts`)

### GET /enrollments 🔒

List enrollments for current user (student) or all users (admin).

| Parameter | Location | Type |
|-----------|----------|------|
| user_id | query | number |
| product_id | query | number |
| status | query | enum |

---

### PATCH /enrollments/:id 🔑

Update enrollment (extend or revoke).

| Parameter | Type | Required |
|-----------|------|----------|
| expires_at | datetime | ❌ |
| status | enum | ❌ |
| reason | string | ✅ (for audit) |

---

## 7. Orders (`orders.ts`)

### GET /orders 🔒

List orders. Students see own orders; admin sees all.

| Parameter | Location | Type |
|-----------|----------|------|
| status | query | enum |
| user_id | query | number |
| product_id | query | number |

---

### GET /orders/:id 🔒

Get order detail with payment events.

---

### PATCH /orders/:id 🔑

Manual reconciliation (admin only).

| Parameter | Type | Required |
|-----------|------|----------|
| status | enum | ✅ |
| reason | string | ✅ |

**Side Effect:** If changing to `paid`, creates enrollment automatically.

---

## 8. Checkout (`checkout.ts`)

### POST /checkout/register-and-pay 🔓

Combined guest registration and payment initiation.

| Parameter | Type | Required |
|-----------|------|----------|
| email | string | ✅ |
| full_name | string | ✅ |
| password | string | ✅ |
| product_id | number | ✅ |
| voucher_code | string | ❌ |

**Response 200:**
```json
{ "orderId": 42, "paymentUrl": "https://...", "billCode": "abc123" }
```

---

### POST /checkout/vouchers/apply 🔓

Validate and calculate voucher discount.

| Parameter | Type | Required |
|-----------|------|----------|
| code | string | ✅ |
| product_id | number | ✅ |

**Response 200:**
```json
{ "valid": true, "discount": 10.00, "new_total": 39.00, "voucher": {...} }
```

---

### GET /checkout/orders/:id/status 🔒

Poll order payment status.

**Response 200:**
```json
{ "orderId": 42, "status": "paid", "enrollmentId": 15 }
```

---

### POST /checkout/orders/:id/verify 🔒

Verify payment status directly with ToyyibPay API when callback has not arrived.

**Processing:**
1. Look up order by ID, verify ownership
2. Check order status is `pending`
3. Extract `bill_code` from payment events
4. Call ToyyibPay `getBillTransactions` API
5. If paid (status=1): update order → paid, create enrollment
6. If failed (status=3): update order → failed
7. Otherwise: return current pending status

**Response 200:**
```json
{ "orderId": 42, "status": "paid", "enrollmentId": 15 }
```

**Usage:** Called by checkout result page as fallback when ToyyibPay server-to-server callback cannot reach localhost during development.

---

## 9. Payment Callbacks (`checkout.ts`)

### POST /payments/callbacks/:provider 🖥️

Generic payment gateway callback.

**Content-Type:** `application/x-www-form-urlencoded` (ToyyibPay)

**ToyyibPay Fields:**
| Field | Description |
|-------|-------------|
| refno | Bill code |
| status | 1=success, 2=pending, 3=failed |
| billcode | ToyyibPay bill code |
| order_id | Our order ID |
| transaction_id | Gateway transaction ref |

**Response:** `200 OK`

---

## 10. Users (`users.ts`) 🔑

### GET /users

Admin: paginated user list with search.

### GET /users/:id

Admin: user detail with enrollments, orders, attempts.

### PATCH /users/:id

Admin: suspend/reactivate user (requires reason for audit).

---

## 11. Sessions (`sessions.ts`) 🔑

### GET /users/:userId/sessions

Admin: list user's active sessions.

### DELETE /users/:userId/sessions/:sessionId

Admin: revoke a user's session.

### GET /users/:userId/session-policy

Admin: get user's session policy.

### PUT /users/:userId/session-policy

Admin: set max_sessions and refresh_ttl_days.

---

## 12. Vouchers (`vouchers.ts`) 🔑

### GET /vouchers

List all vouchers with pagination.

### POST /vouchers

Create a new voucher.

| Parameter | Type | Required |
|-----------|------|----------|
| code | string | ✅ |
| type | enum(fixed,percentage) | ✅ |
| amount | number | ✅ |
| min_order | number | ❌ |
| usage_limit | number | ❌ |
| per_user_limit | number | ❌ |
| product_id | number | ❌ |
| valid_from | datetime | ❌ |
| valid_until | datetime | ❌ |

### PATCH /vouchers/:id

Update voucher (limits, validity, status).

### GET /vouchers/:id/redemptions

List redemptions for a voucher.

---

## 13. Categories (`categories.ts`) 🔑

### GET /categories

List all categories.

### POST /categories

Create category.

| Parameter | Type | Required |
|-----------|------|----------|
| name | string | ✅ |
| slug | string | ✅ |
| description | string | ❌ |

### PATCH /categories/:id

Update category.

---

## 14. Reports (`reports.ts`) 🔑

### GET /reports/sales

Sales summary by period.

| Parameter | Type | Description |
|-----------|------|-------------|
| period | enum | daily/weekly/monthly |
| from | date | Start date |
| to | date | End date |
| product_id | number | Optional filter |

### GET /reports/enrollments

Enrollment statistics.

### GET /reports/attempts

Attempt statistics (pass rate, avg score).

### GET /reports/export/:type

Download report as CSV.

---

## 15. Audit Logs (`audit-logs.ts`) 🔑

### GET /audit-logs

List audit logs with filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| actor_user_id | number | Filter by actor |
| action_key | string | Filter by action |
| entity_type | string | Filter by entity type |
| from | date | Start date |
| to | date | End date |

---

## 16. App Settings (`settings.ts`) 🔑

### GET /settings

List all app settings.

### PUT /settings/:key

Update a setting value.

| Parameter | Type | Required |
|-----------|------|----------|
| value | string | ✅ |

---

## Common Response Patterns

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "error": "Human-readable message",
  "details": [{ "field": "email", "message": "Invalid email" }]
}
```

### Rate Limit Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1713369600
```
