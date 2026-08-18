# Admin Portal — Operator Guide

> **Audience:** Admin users (super_admin, admin, content_admin, support_admin) operating the PMP Practice Exam Simulator.
> **Updated:** April 2026 (Phase 2)
> **Companion docs:** [PHASE-2-FEATURES.md](PHASE-2-FEATURES.md) · [CHANGELOG](CHANGELOG.md) · [DOMAIN-TAGGING](DOMAIN-TAGGING.md)

This guide covers day-to-day operation of the admin portal at `/admin`, with emphasis on the Phase 2 modules: **Vouchers**, **Referrals**, **Organizations**, **User Management** (single + bulk import) and the **Question Importer** (CSV + Excel).

---

## Table of Contents

1. [Getting In](#1-getting-in)
2. [Sidebar Navigation](#2-sidebar-navigation)
3. [Roles & Permissions](#3-roles--permissions)
4. [User Management](#4-user-management)
   - [Add a Single User](#41-add-a-single-user)
   - [Bulk Import Students from CSV](#42-bulk-import-students-from-csv)
   - [Suspend / Reactivate](#43-suspend--reactivate)
   - [Change a User's Role](#44-change-a-users-role)
5. [Vouchers](#5-vouchers)
   - [Create a Single Voucher](#51-create-a-single-voucher)
   - [Bulk-Issue Voucher Codes](#52-bulk-issue-voucher-codes)
   - [Analytics & Expiry Watch](#53-analytics--expiry-watch)
   - [Voucher Reference](#54-voucher-reference)
6. [Referrals (Refer & Earn)](#6-referrals-refer--earn)
   - [How the Program Works](#61-how-the-program-works)
   - [Referrals Tab](#62-referrals-tab)
   - [Manually Reward a Pending Redemption](#63-manually-reward-a-pending-redemption)
   - [Anti-fraud Rules](#64-anti-fraud-rules)
7. [Organizations (B2B)](#7-organizations-b2b)
   - [Tiered Seat Discount](#71-tiered-seat-discount)
   - [Create an Organization](#72-create-an-organization)
   - [Add / Remove Members](#73-add--remove-members)
   - [Generate a Quote](#74-generate-a-quote)
8. [Question Library](#8-question-library)
   - [CSV Import (with Aliases)](#81-csv-import-with-aliases)
   - [Excel (.xlsx) Upload](#82-excel-xlsx-upload)
   - [Question Types & Correct-Answer Format](#83-question-types--correct-answer-format)
   - [Difficulty & Status Fields](#84-difficulty--status-fields)
   - [Export](#85-export)
9. [Orders & Enrollments](#9-orders--enrollments)
10. [Audit Log](#10-audit-log)
11. [Known Gaps & Workarounds](#11-known-gaps--workarounds)
12. [Quick API Reference](#12-quick-api-reference)

---

## 1. Getting In

| Item | Value |
|---|---|
| Portal URL (local) | http://localhost:3000/admin |
| Portal URL (prod) | https://pmes.nscs.site/admin |
| Login URL | `/admin/login` |
| Required role | `admin`, `super_admin`, `content_admin`, or `support_admin` |
| Session timeout | Per server config (`SESSION_TTL_MIN`) |

**First-time super admin setup:** If no admin exists yet, create one via the CLI script (see [QUICK-DEPLOY-INSTRUCTIONS.md#create-super-admin-user](../QUICK-DEPLOY-INSTRUCTIONS.md#create-super-admin-user)).

If you see "Forbidden" after login, your account role is wrong — only a `super_admin` can change it (see §4.4).

---

## 2. Sidebar Navigation

The sidebar is grouped into **five collapsible sections**. Section state persists per browser via `localStorage` keys `admin-sidebar-sections` (per-section) and `admin-sidebar-collapsed` (entire sidebar).

| Section | Tabs |
|---|---|
| **Overview** | Dashboard, Reports |
| **Catalog** | Exams, Tests, Categories, ECO Domains, Performance Domains |
| **Content** | Questions, CSV Ops, Versions |
| **Users & Sales** | Users, Orders, **Vouchers**, **Referrals**, **Organizations** |
| **System** | Sessions, Policies, Settings, Audit Log |

Click the chevron next to any section header to collapse it. Click the rail-collapse button at the very top to shrink the entire sidebar to icons only.

---

## 3. Roles & Permissions

| Role | Can do |
|---|---|
| `student` | No admin access |
| `support_admin` | View users/orders, suspend users, reconcile orders, extend enrollments |
| `content_admin` | Manage questions, exams, categories, domains, CSV import |
| `admin` | Everything except role changes and creating non-student users |
| `super_admin` | All of the above + change roles + create admins |

**Role-restricted operations:**

- **Change role**: `super_admin` only. Cannot change your own role.
- **Create non-student users via Add User**: `super_admin` only.
- **Bulk import users**: any admin (creates students only).

---

## 4. User Management

Tab: **Users & Sales → Users**

### 4.1 Add a Single User

1. Click **+ Add User** (top right of Users card).
2. Fill the form:
   - **Email** *(required)*
   - **Full Name** *(required)*
   - **Password** *(optional)* — leave blank to auto-generate a 14-char password (alphanumerics + safe symbols, no ambiguous `0/O/1/l/I`).
   - **Role** — `student` for normal use. Non-student requires `super_admin`.
   - **Access Days** *(optional)* — overrides the product's default access window when an enrollment is created.
   - **Enroll into Product (slug)** *(optional)* — e.g. `pmp-mock-01`. Creates an active enrollment immediately.
   - **Send welcome email** — checked by default. Sends an inline-HTML email containing the cleartext temporary password.
3. Click **Create User**.

If you let the system generate the password, the response also returns it once on screen — **copy it now**, it cannot be retrieved later (only the bcrypt hash is stored).

> **Email failures are non-blocking.** If SMTP is misconfigured, the user is still created. The temp password is shown to you in the success toast.

### 4.2 Bulk Import Students from CSV

1. Click **Bulk Import** (top right of Users card).
2. Paste a CSV with at least these columns (case-insensitive aliases work — see below):

   ```csv
   email,fullName,password,productSlug,accessDays
   jane.doe@example.com,Jane Doe,,pmp-mock-01,90
   john@example.com,John Smith,Welcome2026!,pmp-foundation-pack,
   ```

3. Toggle **Send welcome email to each new user** as needed.
4. Click **Preview** — you'll see:
   - **Total** rows parsed
   - **New** vs **Duplicates** (already in DB)
   - **With enrollment** (rows whose `productSlug` resolved to an existing product)
   - **Errors** (invalid email, missing fullName, in-file duplicates)
5. Click **Apply Import** to create the new users + enrollments + send emails.

**Header aliases** (all case-insensitive, hyphens/spaces/underscores ignored):

| Canonical | Accepted Aliases |
|---|---|
| `email` | EmailAddress, E-Mail |
| `fullName` | name, Full Name |
| `password` | pwd |
| `productSlug` | product, slug |
| `accessDays` | days, access |

**Per-row behaviour:**
- Duplicate email **within the file** → row dropped with error.
- Duplicate email **already in DB** → row skipped at apply time (counted in `skipped`).
- Empty/short password → auto-generated.
- `productSlug` not found → user still created, no enrollment.
- Welcome email failure → user still created, no rollback.

### 4.3 Suspend / Reactivate

In the Users table, use the action dropdown to suspend a user (status changes to `suspended`, login is denied). A reason prompt is required and stored in the audit log.

### 4.4 Change a User's Role

`super_admin` only. In the Users table, click the role badge and choose a new role. A reason prompt is required. Cannot self-modify.

---

## 5. Vouchers

Tab: **Users & Sales → Vouchers**

### 5.1 Create a Single Voucher

1. Click **+ New Voucher**.
2. Fill the form:

   | Field | Notes |
   |---|---|
   | **Code** | Must be unique. Auto-uppercased. Letters, numbers, hyphens. |
   | **Type** | `fixed` (RM amount) or `percentage` (0–100). |
   | **Amount** | RM value or percent (depending on type). |
   | **Min Order** | Voucher only valid if cart subtotal ≥ this value (RM). Default 0. |
   | **Per User Limit** | Max times **one user** may redeem this code. Default 1. |
   | **Total Usage Limit** | Total redemptions across all users. Blank = unlimited. |
   | **Valid Until** | Expiry date (date-only). Blank = no expiry. |

3. Click **Create**.

The voucher is `active` immediately and validated by the public checkout endpoint `POST /api/checkout/apply-voucher`.

### 5.2 Bulk-Issue Voucher Codes

For campaigns where you want to hand out N unique single-use codes (e.g. partner promo, conference giveaway):

1. Click **Bulk Issue**.
2. Fill:
   - **Prefix** — 2–20 chars, A-Z/0-9/`-`/`_`. Auto-uppercased.
   - **Count** — 1 to 500.
   - **Type** — `percentage` (default) or `fixed`.
   - **Amount** — percent or RM.
   - **Valid Until** — date.
3. Click **Issue Codes**.

Each code is generated as `PREFIX-XXXXXX` where `XXXXXX` is 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ambiguous characters removed). Per-user-limit and usage-limit are **both 1** — these are single-redemption codes.

The response returns the full list of `{id, code}`. Copy them out before closing the dialog (no retrieval API yet).

### 5.3 Analytics & Expiry Watch

`GET /api/admin/vouchers/analytics` returns:

```json
{
  "summary": { "totalVouchers": 23, "totalRedemptions": 0, "totalDiscount": 0, "expiringSoon": 4 },
  "vouchers": [ { "code": "WELCOME10", "type": "percentage", "amount": 10,
                  "redemptions": 0, "totalDiscount": 0, "validUntil": "2026-06-01" } ]
}
```

**`expiringSoon`** counts vouchers expiring within 14 days.

> ⚠️ **Known gap:** `redemptions` and `totalDiscount` will currently show **0 for every voucher**. The analytics query joins to a table called `order_vouchers` which is **not created in the current schema** — the endpoint silently falls back to listing vouchers without redemption stats. To enable real redemption tracking, create the join table and have the checkout flow insert a row each time a voucher is applied. See [§11 Known Gaps](#11-known-gaps--workarounds).

### 5.4 Voucher Reference

| Field | Type | Default | Notes |
|---|---|---|---|
| `code` | VARCHAR(64) UNIQUE | — | Stored uppercase. |
| `type` | ENUM | `fixed` | `fixed` or `percentage` |
| `amount` | DECIMAL(10,2) | — | RM or percent (0–100) |
| `min_order` | DECIMAL(10,2) | 0 | Subtotal threshold |
| `usage_limit` | INT NULL | NULL | NULL = unlimited |
| `per_user_limit` | INT | 1 | |
| `product_id` | INT NULL | NULL | Restrict to one product when set |
| `valid_from` | TIMESTAMP | now | |
| `valid_until` | TIMESTAMP NULL | NULL | NULL = no expiry |
| `status` | ENUM | `active` | `active` or `disabled` |

---

## 6. Referrals (Refer & Earn)

Tab: **Users & Sales → Referrals**

### 6.1 How the Program Works

1. **Auto-issued code.** When any new user signs up, the system creates a unique 8-character referral code via `ensureReferralCodeForUser()`. Existing users get one the first time they hit `GET /api/student/referral/me`.
2. **Code format:** 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`). Example: `K3TQX9PM`.
3. **Tracking on signup:** the API checks `request.body.referralCode` first, then falls back to `request.cookies.ref`. If found and not self-referral, a row is inserted into `referral_redemptions` with status `pending`.
4. **Reward trigger:** when the referee completes their **first paid order**, `processReferralReward()` runs in the checkout's paid-status branch:
   - Issues **15% percentage voucher** (90-day expiry, 1 redemption, 1 per-user) to **both** referrer and referee.
   - Vouchers are coded `REF-R{refId}-{timestamp36}` (referrer) and `REF-E{refId}-{timestamp36}` (referee).
   - Marks the redemption row `rewarded` with `rewarded_at` timestamp.
   - Increments the referrer's `referral_codes.total_redemptions` counter.
5. **Idempotent:** runs only on the literal first paid order (`COUNT(orders WHERE user_id = ? AND status = 'paid') == 1`). Safe to re-trigger.

### 6.2 Referrals Tab

Four summary cards:
- **Total Codes** — count of users with a code.
- **Redemptions** — sum of `referral_codes.total_redemptions`.
- **Total Reward (MYR)** — sum of `referral_codes.total_reward_myr`.
- **Pending** — count of `referral_redemptions` with status `pending`.

Two tables:
- **Top Referrers** — by `totalRedemptions DESC`, top 100.
- **Recent Redemptions** — last 200 rows with referrer/referee email, order ID, status, date, and a **Reward** button on pending rows.

Click **Refresh** to re-fetch.

### 6.3 Manually Reward a Pending Redemption

Pending redemptions exist when the referee signed up with a referral code but hasn't paid yet, **or** when manual review is required (e.g. fraud check). To override and grant the reward without waiting:

1. In the **Recent Redemptions** table, find the row with status `pending`.
2. Click **Reward** — this calls `PATCH /api/admin/referrals/redemptions/:id/reward` with `rewardMyr=15`.
3. The redemption is marked `rewarded`, the referrer's totals are incremented (does NOT auto-issue vouchers — it's a metric-only override). For voucher issuance, manually create vouchers via §5.1.

> Audit-logged as `admin.referral.rewarded`.

### 6.4 Anti-fraud Rules

| Rule | Enforcement |
|---|---|
| **No self-referral** | Skipped at signup if `referrer_user_id == new_user_id`. |
| **One referral per referee** | DB `UNIQUE` constraint on `referee_user_id`. Enforced by `INSERT IGNORE`. |
| **Reward only on first paid order** | `processReferralReward` exits if `COUNT(orders WHERE status='paid') > 1`. |

**Not yet implemented:** same-domain blocking, manual review queue thresholds, IP/device fingerprinting.

---

## 7. Organizations (B2B)

Tab: **Users & Sales → Organizations**

For corporate / bulk-seat customers. An organization is a named entity (e.g. "Acme Corp") with a member list and a discount rule.

### 7.1 Tiered Seat Discount

`defaultSeatDiscount(seats)` returns:

| Seats | Discount |
|---|---|
| 1–4 | 0% |
| 5–9 | **10%** |
| 10–19 | **15%** |
| 20+ | **20%** |

Set `seat_tier_override` on an organization (decimal percent, 0–100) to force a custom rate regardless of seat count.

### 7.2 Create an Organization

1. Click **+ New Organization**.
2. Fill:
   - **Slug** *(required)* — lowercase, numbers, hyphens. Used as a stable identifier.
   - **Name** *(required)* — display name.
   - **Contact Email / Phone** — optional.
   - **Discount Override %** — leave blank to use the tiered formula above. Set a number (e.g. `25`) to force 25% regardless of seats.
   - **Notes** — free-form internal notes.
3. Click **Create**. Default status is `active`.

### 7.3 Add / Remove Members

Currently exposed via API only (no per-org detail page in the UI yet — see §11). Use:

```bash
# Add by email
curl -X POST .../api/admin/organizations/{orgId}/members \
  -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" \
  -d '{"userEmail":"jane@acme.com","role":"member"}'

# Add by user ID
curl -X POST .../api/admin/organizations/{orgId}/members \
  -d '{"userId":42,"role":"admin"}'

# Remove
curl -X DELETE .../api/admin/organizations/{orgId}/members/{memberId}
```

Roles: `owner`, `admin`, `member`. The `(organization_id, user_id)` unique constraint prevents double-membership; you'll get `409 Conflict` if you try.

### 7.4 Generate a Quote

```bash
curl ".../api/admin/organizations/{orgId}/quote?seats=12" -H "Cookie: $ADMIN_COOKIE"
```

Response:

```json
{ "seats": 12, "discountPercent": 15, "source": "default-tier" }
```

`source` is `"override"` if the org has a `seat_tier_override` set, otherwise `"default-tier"`.

> The downstream B2B-checkout flow that consumes this quote and inserts into `organization_orders` is **not yet wired in the public checkout** — it's a foundation endpoint only.

---

## 8. Question Library

Tab: **Content → Questions / CSV Ops / Versions**

### 8.1 CSV Import (with Aliases)

Headers are case-insensitive and tolerant of spaces/dashes/underscores.

| Canonical | Accepted Aliases |
|---|---|
| `prompt` | Question, QuestionText, Stem |
| `optionA` … `optionD` | A, B, C, D / Option A / Answer A |
| `correctAnswer` | Answer, Correct, Key |
| `explanation` | Rationale, Reasoning |
| `questionType` | Type |
| `ecoDomain` | Domain, EcoTag |
| `performanceDomain` | Process Group, PerfTag |
| `imageUrl` | Image |
| `status` | (literal) — see §8.4 |
| `difficulty` | Level |

Workflow:

1. Go to **Content → CSV Ops**.
2. Pick the target exam from the dropdown.
3. Paste CSV → **Preview** → **Apply**.
4. Skipped rows appear with reasons in `skipReasons[]`.

### 8.2 Excel (.xlsx) Upload

For non-technical content authors who prefer Excel:

1. Same tab, click the **Upload .xlsx** button (next to Export CSV).
2. Pick a `.xlsx` or `.xls` file (≤ 10 MB).
3. The first sheet is parsed via SheetJS, converted to CSV in-memory, then run through the same CSV pipeline.
4. The response shows: `{inserted, total, skippedRows, skipReasons[:20], sheet}`.

Endpoint: `POST /api/admin/questions/upload-xlsx` (multipart, fields: `file`, `examSlug`).

### 8.3 Question Types & Correct-Answer Format

| Type | Required Options | Correct Answer Format |
|---|---|---|
| `single_choice` | A, B, C, D | `A` / `B` / `C` / `D` |
| `multiple_response` | A & B (C/D optional) | Comma- or pipe-separated, e.g. `A,C` or `A\|C` |
| `true_false` | A=True, B=False (auto-mapped) | `True`/`T`/`Yes`/`1` → A; `False`/`F`/`No`/`0` → B |

`questionType` defaults to `single_choice` if absent.

### 8.4 Difficulty & Status Fields

- **`difficulty`** — free-text VARCHAR(20). Recommended values: `easy`, `medium`, `hard`. Stored on both `questions` and `question_versions`.
- **`status`** — normalised at import:
  - `published`, `active`, `live` → `published`
  - anything else (or empty) → `draft`

Drafts are hidden from the student catalog; published questions appear immediately.

### 8.5 Export

`GET /api/admin/questions/export?examSlug=xxx` → CSV with columns:

```
id, questionType, prompt, optionA, optionB, optionC, optionD,
correctAnswer, explanation, ecoDomain, performanceDomain,
imageUrl, status, difficulty
```

This format is **round-trippable** — re-importing the exported CSV preserves all fields.

---

## 9. Orders & Enrollments

Tab: **Users & Sales → Orders**

- **Filter by status:** `pending`, `paid`, `failed`, `refunded`.
- **Reconcile** an order: `PATCH /orders/:id/reconcile` — manually flip status. If you flip to `paid`, the system auto-creates an active enrollment if none exists.
- **Extend an enrollment:** `PATCH /enrollments/:id/extend` with `{days: N}` — adds N days to `expires_at`.

All actions audit-logged.

---

## 10. Audit Log

Tab: **System → Audit Log**

Last 30 entries (most-recent first). Shows action key, actor email (or `system`), entity type/ID, timestamp.

Common action keys:

- `admin.user.created`, `admin.user.suspended`, `admin.user.role-changed`
- `admin.users.bulk-import`
- `admin.voucher.created`, `admin.voucher.bulk-issued`
- `admin.organization.created`, `admin.organization.member-added`, `admin.organization.member-removed`
- `admin.referral.rewarded`
- `admin.order.reconcile`, `admin.enrollment.extended`

---

## 11. Known Gaps & Workarounds

| # | Gap | Impact | Workaround |
|---|---|---|---|
| 1 | **`order_vouchers` join table not created in schema** | Voucher analytics shows 0 redemptions for every voucher, regardless of actual usage. | Manually count redemptions via `SELECT COUNT(*) FROM orders WHERE voucher_code = '…' AND status='paid'`, **or** add the table + insert rows from `routes/checkout.ts` when a voucher is applied. |
| 2 | **Web frontend doesn't capture `?ref=CODE` cookie** | Referral tracking only works if the user manually pastes a code into a `referralCode` form field (not currently in any signup form). | Add a small client effect on landing pages that reads `URLSearchParams.get("ref")` and sets a 30-day cookie named `ref`; auth signup will pick it up automatically. |
| 3 | **No student "Refer & Earn" UI** | Endpoints `GET /api/student/referral/me` and `/referral/validate/:code` exist but no page consumes them. | Add a card to the student account page rendering `code`, `shareUrl`, and the redemption stats. |
| 4 | **No per-organization detail page** | Adding/removing members must be done via API (curl). | Use the curl recipes in §7.3, or extend the Organizations tab to render a detail panel. |
| 5 | **B2B checkout flow not wired** | `organization_orders` table exists and the quote endpoint works, but no public checkout path inserts into it. | Build a B2B-specific checkout that calls the quote endpoint and writes `organization_orders` on payment. |
| 6 | **Voucher expiry-reminder cron not running** | `expiringSoon` is computed but no scheduled job emails the owner before a voucher expires. | Wire a cron job that hits `/api/admin/vouchers/analytics` daily and sends digest emails. |
| 7 | **Welcome email is plain inline HTML** | Hard to brand-evolve. | Move template to `apps/api/src/lib/templates/welcome.html` + load via `fs.readFileSync`. |
| 8 | **Referral reward only fires on the primary checkout paid callback** | If a payment gateway uses a different code path (e.g. a future Stripe webhook handler), the reward won't issue. | Search for `processReferralReward` and ensure every paid-status path calls it. |
| 9 | **Bulk voucher codes are returned only once** | Closing the dialog without copying the codes loses them. | Use `GET /api/admin/vouchers` + filter by prefix to retrieve them later. They're persisted; the dialog just doesn't auto-show them. |
| 10 | **No CAPTCHA on signup** | Bulk fake referral signups are technically possible. | Anti-fraud (§6.4) limits damage but you may want to add hCaptcha/Turnstile to public signup. |

---

## 12. Quick API Reference

All endpoints below require an admin session cookie (`Cookie: ${session_cookie}`). Replace `:id` with the actual entity ID.

### Users

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/users?search=&limit=&offset=` | Paginated list. |
| `GET` | `/api/admin/users/:id` | Detail + enrollments + recent orders. |
| `POST` | `/api/admin/users` | Create single user. |
| `POST` | `/api/admin/users/import/preview` | `{csv}` — dry run. |
| `POST` | `/api/admin/users/import/apply` | `{csv, sendWelcomeEmail}`. |
| `PATCH` | `/api/admin/users/:id/status` | `{status, reason}`. |
| `PATCH` | `/api/admin/users/:id/role` | super_admin only. |

### Vouchers

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/vouchers` | Last 100. |
| `POST` | `/api/admin/vouchers` | Single create. |
| `POST` | `/api/admin/vouchers/bulk` | `{prefix, count, type, amount, …}`. |
| `GET` | `/api/admin/vouchers/analytics` | Summary + per-voucher stats (see gap #1). |

### Referrals

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/referrals` | Codes + redemptions + summary. |
| `PATCH` | `/api/admin/referrals/redemptions/:id/reward` | `{rewardMyr}` — manual override. |
| `GET` | `/api/student/referral/me` | Student endpoint (auto-issues code). |
| `GET` | `/api/student/referral/validate/:code` | Validate a pasted code. |

### Organizations

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/organizations` | List with member/order counts. |
| `GET` | `/api/admin/organizations/:id` | Detail + members + recent orders. |
| `POST` | `/api/admin/organizations` | Create. |
| `PATCH` | `/api/admin/organizations/:id` | Partial update (slug immutable). |
| `POST` | `/api/admin/organizations/:id/members` | `{userEmail OR userId, role}`. |
| `DELETE` | `/api/admin/organizations/:id/members/:memberId` | Remove. |
| `GET` | `/api/admin/organizations/:id/quote?seats=N` | Discount calculation. |

### Questions

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/admin/questions/import-preview` | CSV preview. |
| `POST` | `/api/admin/questions/apply-import` | CSV apply. |
| `POST` | `/api/admin/questions/upload-xlsx` | Multipart `.xlsx`/`.xls` upload. |
| `GET` | `/api/admin/questions/export?examSlug=` | CSV download. |

### Orders & Enrollments

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/orders?status=&limit=&offset=` | Filterable list. |
| `PATCH` | `/api/admin/orders/:id/reconcile` | Flip status; auto-enrolls on `paid`. |
| `PATCH` | `/api/admin/enrollments/:id/extend` | `{days}` — additive. |

---

## Implementation Verification (April 2026)

| Module | DB schema | API | Admin UI | Status |
|---|---|---|---|---|
| Add User (single) | ✅ users table | ✅ `POST /users` | ✅ modal | **Working** |
| Bulk Import CSV | ✅ users + enrollments | ✅ preview + apply | ✅ modal with preview | **Working** |
| Welcome email | n/a | ✅ via `sendMail()` | ✅ checkbox | **Working** (silent on SMTP fail) |
| Voucher single create | ✅ vouchers table | ✅ `POST /vouchers` | ✅ modal | **Working** |
| Voucher bulk issue | ✅ | ✅ `POST /vouchers/bulk` | ✅ modal | **Working** |
| Voucher analytics | ⚠️ missing `order_vouchers` | ✅ with fallback | ✅ (shows 0 redemptions) | **Partial** — see gap #1 |
| Referral codes | ✅ `referral_codes` | ✅ auto-issue + admin list | ✅ tab | **Working** |
| Referral signup tracking | ✅ `referral_redemptions` | ✅ via `body.referralCode` or `cookies.ref` | n/a | **Working** (but cookie not set by web — gap #2) |
| Referral reward on paid | ✅ | ✅ `processReferralReward()` | ✅ manual override button | **Working** on primary paid callback |
| Student "Refer & Earn" UI | n/a | ✅ `/student/referral/me` | ❌ no page | **API-only** — gap #3 |
| Organizations CRUD | ✅ 3 tables | ✅ full CRUD + members + quote | ✅ tab (list + create) | **Working** (member mgmt via API only — gap #4) |
| Tiered seat discount | n/a | ✅ `defaultSeatDiscount()` + override | n/a | **Working** (no checkout consumer — gap #5) |
| Question CSV importer v2 | ✅ + `difficulty` | ✅ aliases + 3 types | ✅ existing CSV ops | **Working** |
| Excel upload | n/a | ✅ `POST /upload-xlsx` (SheetJS) | ✅ button | **Working** |
| Sidebar groups | n/a | n/a | ✅ persistent collapse | **Working** |
| AdminModal primitives | n/a | n/a | ✅ in use for new modals | **Working** (legacy `prompt()` sites still exist) |

Type-checks: `pnpm --filter api exec tsc --noEmit` ✅ · `pnpm --filter web exec tsc --noEmit` ✅
