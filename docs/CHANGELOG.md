# Changelog — Recent Development Sessions

Summary of changes made across recent sessions for agent handoff context. Read alongside `README.md`, `plan.md`, and `DOMAIN-TAGGING.md`.

---

## Session: Voucher / Maintenance Mode / Referral Bug Fixes (2026-05-12)

### Bug Fixes

1. **Voucher creation broken — MySQL datetime format** (`apps/api/src/routes/admin/users.ts`)
   - **Root cause**: Both single-create (`POST /api/admin/vouchers`) and bulk-issue (`POST /api/admin/vouchers/bulk`) used `new Date().toISOString()` for the `valid_from` column, producing ISO 8601 strings like `2026-05-12T07:41:41.694Z`. MySQL's TIMESTAMP column rejects this format in prepared statements.
   - **Fix**: Added `toMySQLDatetime()` helper in `apps/api/src/helpers.ts` that converts JS Date/ISO strings to `YYYY-MM-DD HH:MM:SS` format. Applied to both `valid_from` and `valid_until` in single-create and bulk-issue routes.

2. **SAVE10 voucher seeded as 'fixed' instead of 'percentage'** (`infra/docker/mysql/init/002_seed.sql`)
   - The demo voucher `SAVE10` was seeded with `type='fixed'` and `amount=10.00`, which gave a flat RM 10 discount instead of 10%.
   - Changed to `type='percentage'` so it correctly applies a 10% discount.
   - Also updated the live database for the running instance.

3. **Maintenance mode not enforced** (`apps/api/src/app.ts`)
   - **Root cause**: The admin Settings page could toggle `maintenanceMode` in `app_settings`, but **no middleware checked the flag** — users could still access all endpoints.
   - **Fix**: Added Express middleware before route handlers that:
     - Checks `maintenanceMode` in `app_settings` (cached with 5-second TTL to avoid per-request DB queries)
     - Returns `503 { message, maintenance: true }` for blocked routes
     - Always allows: `/health`, `/api/admin/*`, `/api/auth/*`, `/uploads/*`
     - Uses the custom `maintenanceMessage` from settings if set

4. **Referral reward voucher datetime format** (`apps/api/src/routes/admin/referrals.ts`)
   - The `processReferralReward()` function also used `new Date(...).toISOString()` for the `valid_until` of auto-generated referral vouchers. Applied the same `toMySQLDatetime()` fix.

### Files Changed
- `apps/api/src/helpers.ts` — Added `toMySQLDatetime()` export
- `apps/api/src/app.ts` — Added maintenance mode middleware
- `apps/api/src/routes/admin/users.ts` — Fixed datetime in voucher create/bulk routes
- `apps/api/src/routes/admin/referrals.ts` — Fixed datetime in referral reward voucher creation
- `infra/docker/mysql/init/002_seed.sql` — SAVE10 type changed to 'percentage'

---

## Session: Phase 2 Gap Fixes — Wire-up of Vouchers, Referrals & Organizations

Closes the "Open items" left from the Phase 2 session. All five critical functional gaps from `ADMIN-GUIDE.md` §11 are now end-to-end functional.

### Fixes

1. **Voucher analytics SQL corrected** (`apps/api/src/routes/admin/users.ts`)
   - The previous query joined a non-existent `order_vouchers` table and silently fell back to zeroes.
   - Now joins the real `voucher_redemptions` table to `orders`, counting redemptions and summing `discount_amount` only when the parent order is `paid`. Removed the try/catch fallback.

2. **`?ref=CODE` cookie capture + cross-origin forwarding**
   - New client component `apps/web/app/components/RefCookieCapture.tsx` reads `?ref=` from the URL on mount and writes a 30-day `ref` cookie (sanitized, `SameSite=Lax`, `Secure` on HTTPS). Mounted in `PublicNavbar` so every public page captures it.
   - New `getRefCookie()` helper in `apps/web/lib/api.ts`.
   - Both checkout flows (`(public)/checkout/screen.tsx` and `(public)/checkout/cart/screen.tsx`) read the cookie and forward it as `referralCode` in the guest signup body — this works around the dev cross-origin cookie limitation (web on `:3000` → api on `:4000`).
   - `guestCheckoutSchema` (`apps/api/src/schemas.ts`) accepts the new optional `referralCode` field.
   - `checkout.ts` register-and-pay branch now auto-issues a referral code for the new user **and** inserts a pending `referral_redemptions` row when the body field or `cookies.ref` resolves to a real referrer.

3. **Student "Refer & Earn 15%" card** (`apps/web/app/(student)/me/account/`)
   - Loaded via SSR in `page.tsx` (forwards the auth cookie to the API; matches the existing Order History pattern) and passed in as `initialReferral` — avoids the cross-origin cookie issue.
   - Card shows: copyable share URL, the 8-char code with copy button, two stat tiles (Friends Joined / Rewards Earned), and a "Recent referrals" list with masked emails and pending/rewarded badges.
   - Bug fix during this session: the call originally targeted `/api/student/referral/me` but the student router is mounted at `/api`, so the correct path is `/api/referral/me` — fixed in both SSR and browser fallback.

4. **Per-organization detail / Manage modal** (`apps/web/app/admin/screen.tsx`)
   - Added a "Manage" button on each org row that opens a large modal with:
     - Members table (role badges, remove button per row).
     - Add-member-by-email form with role selector (owner / admin / member).
     - Recent seat-orders table.

5. **B2B seat-order endpoint + admin UI**
   - New `POST /api/admin/organizations/:id/orders` (`apps/api/src/routes/admin/organizations.ts`):
     - Validates each `memberUserIds[]` actually belongs to the org.
     - Computes discount via `seat_tier_override` or `defaultSeatDiscount(seats)`.
     - Inserts a single `orders` row (buyer = org owner/admin) with the discounted total, plus an `organization_orders` join row.
     - When `paymentStatus="paid"`, auto-creates an active enrollment per member (skips already-enrolled). Returns `enrolledCount`, `alreadyEnrolledCount`, `skippedMemberIds`.
     - Audit-logged as `admin.organization.seat-order-created`.
   - Admin UI: product dropdown, payment-status selector, member checkbox list with Select-all / Clear, live "Refresh quote" preview hitting `/quote?seats=N`, and submit button.

### Files modified / added

- **API**: `routes/admin/users.ts` (voucher SQL), `routes/admin/organizations.ts` (new seat-order endpoint), `routes/checkout.ts` (guest referral wiring), `schemas.ts` (`referralCode` field).
- **Web**: `components/RefCookieCapture.tsx` (NEW), `(public)/PublicNavbar.tsx` (mount), `lib/api.ts` (`getRefCookie`), `(public)/checkout/screen.tsx`, `(public)/checkout/cart/screen.tsx` (forward referral code), `(student)/me/account/page.tsx` + `screen.tsx` (Refer & Earn card via SSR), `admin/screen.tsx` (org Manage modal + seat-order UI + handlers + types).

### Verification

- `pnpm --filter api exec tsc --noEmit` → clean.
- `pnpm --filter web exec tsc --noEmit` → clean.

---

## Session: Phase 2 — Admin Polish, Importer v2, Referrals & B2B Orgs

See [PHASE-2-FEATURES.md](PHASE-2-FEATURES.md) for the full reference.

### Features

1. **Admin sidebar restructure** — five collapsible groups (Overview / Catalog / Content / Users & Sales / System) with per-section persistence in localStorage.
2. **AdminModal / ConfirmModal / PromptModal** primitives — Bootstrap-styled, ESC + backdrop close, body-scroll lock. File: `apps/web/app/admin/components/AdminModal.tsx`.
3. **Question importer v2** — case-insensitive header aliases, `multiple_response` + `true_false` normalization, `difficulty` column, per-row `skipReasons[]` diagnostics, **`.xlsx` upload** via SheetJS at `POST /api/admin/questions/upload-xlsx`. CSV export updated to match.
4. **Add User (single)** — modal-driven `POST /api/admin/users` with optional auto-generated 14-char password, optional product enrollment, welcome email with cleartext temp password.
5. **Bulk import students** — `POST /api/admin/users/import/preview` + `…/apply`, header-aliased CSV, per-row enrollment, optional welcome email per user.
6. **Voucher upgrades** — modal-driven create (replaces `prompt()`), `POST /api/admin/vouchers/bulk` (PREFIX-XXXXXX, ≤500), `GET /api/admin/vouchers/analytics` with redemption stats + `expiringSoon` (graceful fallback if `order_vouchers` join table missing).
7. **Referral program** — auto-issued 8-char code per user, `?ref=` cookie tracked at signup, **15% reward voucher (90-day expiry) for both parties on first paid order** of the referee. Admin tab + `GET /api/student/referral/me`.
8. **B2B organizations** — full CRUD + members + tiered seat discount (5+=10%, 10+=15%, 20+=20%) with per-org `seat_tier_override`. Admin tab + quote endpoint `GET /api/admin/organizations/:id/quote?seats=N`.

### Schema additions

```sql
ALTER TABLE questions          ADD COLUMN difficulty VARCHAR(20) NULL;
ALTER TABLE question_versions  ADD COLUMN difficulty VARCHAR(20) NULL;

CREATE TABLE referral_codes        (...);
CREATE TABLE referral_redemptions  (...);  -- UNIQUE(referee_user_id)
CREATE TABLE organizations         (...);
CREATE TABLE organization_members  (...);  -- UNIQUE(organization_id, user_id)
CREATE TABLE organization_orders   (...);  -- UNIQUE(order_id)
```

All migrations applied via `apps/api/src/db.ts` runtime statements.

### New / changed files

- **API**: `routes/admin/{users,content,referrals,organizations,index}.ts`, `routes/auth.ts` (signup hook), `routes/checkout.ts` (paid callback hook), `routes/student.ts` (referral endpoints), `helpers.ts`, `types.ts`, `db.ts`.
- **Web**: `app/admin/screen.tsx` (sidebar groups, Referrals + Organizations tabs, all modals), `app/admin/components/AdminModal.tsx`.
- **Deps**: `xlsx` (SheetJS) added to `apps/api`.

### Open items

- Frontend `?ref=CODE` cookie capture & student "Refer & Earn" UI (endpoints ready, UI deferred).
- Migration of remaining native `prompt()`/`confirm()` sites in admin to PromptModal/ConfirmModal.
- BRD/ERD/FSD spec doc updates (PHASE-2-FEATURES.md is the working reference until then).

---

## Session: Question Types, Role-Based Access, Receipts & Draft/Published Workflow

### Features

1. **Multiple response & true/false question types** (H.2)
   - `question_type` ENUM('single_choice','multiple_response','true_false') on questions + question_versions
   - `correct_answer` widened from CHAR(1) to VARCHAR(10) for comma-separated multi-response answers
   - Backend scoring handles multiple_response via sorted array comparison
   - Admin form: question type dropdown, conditional options C/D (hidden for true/false), comma-separated correct answer input for MR
   - Simulator: multi-response toggle selection, true/false shows only A/B, training feedback uses array comparison
   - Attempt review: multi-response correct/selected display with conditional option rendering
   - CSV import/export: supports questionType column

2. **Role-based admin access** (K.1)
   - User role expanded to 5-tier ENUM: student, admin, super_admin, content_admin, support_admin
   - `requireRole(...roles)` middleware for fine-grained endpoint protection
   - Admin user table: role dropdown with color-coded badges, super_admin-only role changes
   - PATCH `/api/admin/users/:id/role` endpoint with audit logging and self-change prevention

3. **Receipt/invoice download** (F.3)
   - GET `/api/orders/:id/receipt` — JSON receipt with product, payment, customer details
   - `?format=html` — printable styled HTML receipt with @media print support
   - Frontend: "View Receipt" link on paid orders in account page
   - `escapeHtml` helper for XSS-safe HTML generation

4. **Draft/published workflow UI** (E.4)
   - `status` ENUM('draft','published') on questions table
   - Admin question form: status dropdown (Published/Draft)
   - Admin question table: status column with color badges
   - Student exam queries filter `WHERE status = 'published'` — draft questions hidden from students

### Database Migration

- `infra/docker/mysql/init/015_question_types_roles.sql`
  - ALTER questions: add question_type, modify correct_answer, add status
  - ALTER question_versions: add question_type, modify correct_answer
  - ALTER users: expand role ENUM to 5 tiers
- `apps/api/src/db.ts`: 6 new runtime ALTER statements for existing databases
- `infra/docker/mysql/init/001_schema.sql`: updated for fresh installs

### Files Modified

- Backend: `db.ts`, `schemas.ts`, `routes/admin/content.ts`, `routes/student.ts`, `middleware/auth.ts`, `routes/admin/users.ts`
- Frontend: `lib/admin-api.ts`, `lib/api.ts`, `app/admin/screen.tsx`, `app/(public)/exams/[slug]/simulator.tsx`, `app/(student)/attempts/[id]/screen.tsx`, `app/(student)/me/account/screen.tsx`

---

## Session: Domain Rename & Domain Management Tabs

### Refactoring

1. **Renamed `tag` → `eco_domain` and `category` → `performance_domain`**
   - Renamed in DB columns: `questions.tag` → `questions.eco_domain`, `questions.category` → `questions.performance_domain`
   - Same for `question_versions` table
   - Migration: `infra/docker/mysql/init/014_rename_domain_columns.sql`
   - Runtime ALTER: `apps/api/src/db.ts` runtimeAlterStatements handles existing DBs
   - Updated Docker init SQL: `001_schema.sql`, `003_add_question_fields.sql`
   - Updated seed SQL: `010_pmp_practice_tests.sql`, `012_capm_practice_tests.sql`
   - API schemas: `tag` → `ecoDomain`, `category` → `performanceDomain` in Zod validation
   - API routes: All SQL queries updated in `admin/content.ts` and `student.ts`
   - Frontend types: `AdminQuestion.tag` → `ecoDomain`, `AdminQuestion.category` → `performanceDomain`
   - Admin UI: All form fields, table headers, CSV templates updated
   - CSV import backward compatible: accepts both old (`tag`, `category`) and new (`ecoDomain`, `performanceDomain`) column names

2. **New domain management tables**
   - `eco_domains` (id, product_id, name, description) — per-product ECO domain master list
   - `performance_domains` (id, product_id, name, description) — per-product Performance domain master list
   - Seeded with PMP & CAPM domain data

### Features

3. **Admin ECO Domains tab** — Full CRUD for ECO domains per product
   - Filter by product, create/edit/delete domains
   - API endpoints: GET/POST/PATCH/DELETE `/api/admin/eco-domains`

4. **Admin Performance Domains tab** — Full CRUD for Performance domains per product
   - Same UX as ECO Domains tab
   - API endpoints: GET/POST/PATCH/DELETE `/api/admin/performance-domains`

5. **Reusable DomainManagementTab component** — Shared UI component for both domain tabs
   - Product filter dropdown, inline form for create/edit, delete with confirm

---

## Session: Scoring Fix, Trial Redesign & Get Full Access Fix

### Bug Fixes

1. **Scoring bug — score always 0 on real exams**
   - Root cause: `answers_json` in DB was empty (`{}`) for all real attempts — auto-save silently failed
   - Fix: Submit endpoint (`POST /api/attempts/:id/submit`) now accepts `{ answers }` in the request body as a fallback
   - If DB `answers_json` is empty but client sends answers, the server uses client answers and persists them
   - Frontend `submitAttempt()` now sends `body: JSON.stringify({ answers })` with the submit POST
   - Files: `apps/api/src/routes/student.ts`, `apps/web/app/(public)/exams/[slug]/simulator.tsx`

2. **"Get Full Access" links to wrong page (product not found)**
   - Trial result was linking to `/checkout?product=capm-practice-01` (exam slug) instead of `capm-exam-prep` (product slug)
   - Fix: API now returns `productSlug` in `GET /api/exams/:slug` response (JOIN with products table)
   - TrialSimulator uses `productSlug` prop for the checkout link
   - Files: `apps/api/src/helpers.ts`, `apps/api/src/types.ts`, `apps/web/lib/api.ts`, `apps/web/app/(public)/exams/[slug]/page.tsx`, `simulator.tsx`

### Features

3. **Free trial redesign — full simulator experience**
   - Pre-start screen with training mode toggle option
   - Real countdown timer (same as full exam)
   - Question navigation strip (numbered buttons, green for answered)
   - Auto-next after 350ms in non-training mode
   - Training mode: instant right/wrong feedback with explanation
   - Review screen with question grid before submit
   - Previous/Next/Review/Finish buttons (same as full exam)
   - 5 random questions per trial (unchanged)

4. **Product detail page — simplified exam preview**
   - No longer lists all available tests individually
   - Shows only the first test with a "Try free preview" link
   - Displays total practice test count (e.g. "3 practice tests included")
   - File: `apps/web/app/(public)/products/[slug]/page.tsx`

---

## Session: Performance Analytics & Practice Content

### Features Built

1. **Performance Analytics Page** (`/me/performance`)
   - 5-tab client component using Chart.js (chart.js 4.5.1 + react-chartjs-2 5.3.1)
   - Tabs: Overall (line chart), Past Results (table), Project Performance Domain (progress bars), ECO Domain (progress bars), Trends (bar chart + moving average)
   - Files: `apps/web/app/(student)/me/performance/screen.tsx`, `apps/web/app/(student)/me/performance/page.tsx`
   - API: `GET /api/performance` in `apps/api/src/routes/student.ts` — aggregates attempt answers vs correct_answer, grouped by eco_domain/performance_domain

2. **Auto-Start Exam for Enrolled Users**
   - Enrolled users see exam load and start immediately (no manual button)
   - Non-enrolled users get free trial mini-simulator with 2 preview questions
   - Training mode toggle removed from UI
   - File: `apps/web/app/(public)/exams/[slug]/simulator.tsx`

3. **PMP Practice Tests** (3 × 30 = 90 questions)
   - SQL seed: `infra/docker/mysql/init/010_pmp_practice_tests.sql`
   - Exams: pmp-practice-01 (id=24), pmp-practice-02 (id=25), pmp-practice-03 (id=26)
   - ECO Domain (tag): People 31, Process 45, Business Environment 14
   - Performance Domain (category): Team 17, Planning 13, Delivery 12, Project Work 11, Stakeholders 10, Measurement 10, Uncertainty 9, Dev Approach 8

4. **CAPM Practice Tests** (3 × 10 = 30 questions)
   - SQL seed: `infra/docker/mysql/init/012_capm_practice_tests.sql`
   - Exams: capm-practice-01 (id=27), capm-practice-02 (id=28), capm-practice-03 (id=29)
   - ECO Domain (tag): People 8, Process 17, Business Environment 5
   - Performance Domain (category): Project Management Fundamentals 9, Predictive Methodologies 10, Agile Frameworks 6, Business Analysis 5

5. **Test Seed Data** for test7@gmail.com (user_id=19)
   - SQL seed: `infra/docker/mysql/init/011_seed_test7_attempts.sql`
   - 12 submitted PMP attempts with score progression: 50% → 60% → 80% → 50% → 70% → 93% → 67% → 87% → 83% → 97% → 93% → 90%
   - Scores verified and corrected via validation script

### Bug Fixes

1. **My Exams page empty after purchase**
   - Added `export const dynamic = "force-dynamic"` to prevent Next.js caching
   - Changed `<Link>` to `<a>` tags in checkout result page for full reload
   - File: `apps/web/app/(student)/me/exams/page.tsx`, `apps/web/app/(public)/checkout/result/screen.tsx`

2. **Attempt review "Attempt not found"**
   - Server component wasn't forwarding auth cookies to API fetch
   - Added `cookies()` forwarding + `force-dynamic`
   - File: `apps/web/app/(student)/attempts/[id]/page.tsx`

3. **CAPM product not showing on My Exams**
   - Products with 0 published exams were hidden (`return null`)
   - Now shows "Practice tests are being prepared" placeholder card
   - File: `apps/web/app/(student)/me/exams/page.tsx`

### UI Improvements

- Added "Performance" nav link to student layout sidebar
- Hover/click effects on product cards
- Card spacing fixes

### Documentation Created

- `docs/DOMAIN-TAGGING.md` — Full documentation of the eco_domain/performance_domain system
- `docs/CHANGELOG.md` — This file

---

## Key Technical Details for Agent Handoff

### Database Connection
```bash
docker exec -it pm-mysql mysql -upm_user -ppm_password pm_exam
# or from host: mysql -h127.0.0.1 -P3307 -upm_user -ppm_password pm_exam
```

### Product IDs
- PMP: product_id = 13, slug = "pmp-exam-prep"
- CAPM: product_id = 14, slug = "capm-exam-prep"
- 11 other products (ids 15-25) — training courses without practice exams

### Question Tagging
- `tag` VARCHAR(120) = ECO Domain (People, Process, Business Environment)
- `category` VARCHAR(120) = Performance Domain (varies by certification)
- Both are free-text, not enum — new values auto-appear in analytics
- See `docs/DOMAIN-TAGGING.md` for full details

### Key Patterns
- Next.js pages that fetch with cookies need `export const dynamic = "force-dynamic"` and `cookies()` forwarding
- Use `<a>` instead of `<Link>` when you need to bypass Next.js router cache after mutations
- Payment flow: POST /checkout/orders → ToyyibPay redirect → callback → enrollment activated
- Exam access: enrollment check → auto-start attempt → auto-save → submit → review

### Test Accounts
- Student: `student@example.com` / `demo12345`
- Admin: `admin@example.com` / `admin12345`
- Test data: `test7@gmail.com` / `demo12345` (has enrollments + 12 PMP attempts)
