# PM Practice Exam Platform

Local-first MVP scaffold for a PMP/CAPM custom practice exam simulator. The workspace follows the execution plan in `plan.md`: monorepo layout, Dockerized dependencies, Express API, Next.js web app, and a shared contract package for future expansion.

## Structure

- `apps/web`: Next.js storefront, admin dashboard, and simulator UI
- `apps/api`: Express API with auth, catalog, exam, attempt, and admin routes
- `packages/shared`: shared TypeScript contracts for future app-to-app reuse
- `packages/config`: central environment and platform conventions
- `infra/docker`: local MySQL orchestration

## Quick Ops

- Remote deploy runbook: [QUICK-DEPLOY-INSTRUCTIONS.md](QUICK-DEPLOY-INSTRUCTIONS.md)
- Current Exabytes production runbook: [EXABYTES-PRODUCTION-RUNBOOK.md](EXABYTES-PRODUCTION-RUNBOOK.md)

## Prerequisites

- Node.js 20.11+ (`22 LTS` recommended)
- pnpm 9+
- Docker Desktop

## Bootstrap

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:up
pnpm seed
pnpm dev
```

## Daily Start / Stop (Quick Runbook)

Use this for normal day-to-day testing after initial bootstrap is done.

### Start everything

```bash
# from repo root
pnpm db:up
pnpm dev
```

When ready, you should see:
- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- MySQL: `127.0.0.1:3307`

### Optional: seed demo data again

```bash
pnpm seed
```

### Stop everything

In the terminal running `pnpm dev`, press `Ctrl+C`, then run:

```bash
pnpm db:down
```

### Useful checks

```bash
# confirm mysql container status
docker ps --filter name=pm-mysql

# check API health
curl http://localhost:4000/health
```

## Local URLs

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- MySQL: `localhost:3307`

## What's Built (Working)

### Auth & Sessions
- User registration (`POST /api/auth/register`) and login (`POST /api/auth/login`)
- Forgot password and reset password (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`)
- Cookie-based JWT access + refresh token rotation with SHA-256 hashed storage
- Session tracking in `auth_sessions` table with user-agent and IP
- User and admin session listing and revoke (`GET/DELETE /api/auth/sessions`, `GET/DELETE /api/admin/sessions/:id`)
- Per-user session policies: max concurrent sessions and custom refresh TTL (`GET/PUT /api/admin/session-policies`)
- Auto-revoke oldest session when policy limit exceeded on login
- `GET /api/auth/me` for current user info

### Public Catalog
- Product listing (`GET /api/products`) and detail (`GET /api/products/:slug`)
- Exam listing (`GET /api/exams`) and detail with preview question (`GET /api/exams/:slug`)
- Landing page at `/` with product grid
- Separate product detail page at `/products/[slug]`
- Public FAQ (`/faq`) and tutorial (`/tutorial`) pages

### Checkout & Enrollment
- Order creation (`POST /api/checkout/orders`) with pending status
- Mock payment callback (`POST /api/payments/callbacks/mock`) with idempotent event key
- Automatic enrollment activation on successful payment
- Enrollment listing (`GET /api/enrollments`) and access check (`GET /api/exams/:slug/access`)
- Voucher code apply at checkout (`POST /api/checkout/apply-voucher`) with discounted price display
- Checkout page at `/checkout?product=<slug>`

### Student Portal
- Student dashboard at `/me/dashboard` — active subscriptions, attempt history, resume in-progress exams
- My Exams page at `/me/exams` — lists all purchased products with exam links; shows "Practice tests are being prepared" placeholder for products with no published exams yet
- Attempt results review at `/attempts/[id]` — score summary, pass/fail, per-question review with color-coded answers, "show only incorrect" filter, explanations (with server-side cookie forwarding for auth)
- Account & billing at `/me/account` — profile/password update, order history, receipt download for paid orders
- Performance Analytics at `/me/performance` — 5-tab analytics dashboard powered by Chart.js (chart.js 4.5.1 + react-chartjs-2 5.3.1):
  - **Overall**: Score trend line chart across all attempts
  - **Past Results**: Table of all submitted attempts with pass/fail status
  - **Project Performance Domain**: Breakdown by `category` column — table with progress bars
  - **ECO Domain**: Breakdown by `tag` column — table with progress bars
  - **Trends**: Strongest/weakest areas, bar chart comparison, moving average line
- `GET /api/performance` endpoint — aggregates attempt answers against question correct_answer, grouped by tag (ECO Domain) and category (Performance Domain)
- Student order history (`GET /api/orders`)
- Attempt history (`GET /api/attempts`)
- Profile update (`PATCH /api/auth/profile`)
- Student nav bar: Dashboard, My Exams, Performance, My Account

### Security
- Rate limiting on auth endpoints (10 requests per 60 seconds per IP on register and login)

### Exam Simulator
- Enrollment-gated attempt creation (`POST /api/exams/:slug/attempts`)
- **Auto-start exam** for enrolled users — exam begins immediately on page load (no manual "Start tracked attempt" button)
- Free trial mini-simulator for non-enrolled users — 5 random questions with full features: timer, question navigation, training mode toggle, auto-next, review screen
- Attempt submission includes answers in request body as fallback (prevents score=0 if auto-save fails)
- Auto-save progress with 500ms debounce (`PATCH /api/attempts/:id/progress`)
- Answer selection and mark-for-review tracking with yellow flag indicators
- Countdown timer display (turns red when < 5 minutes remaining)
- Free question navigation with numbered question grid and jump-to
- Strikethrough toggle on individual answer options
- Review screen before final submit with color-coded status grid (green=answered, yellow=flagged, gray=unanswered)
- Auto-submit when timer reaches zero
- Attempt submission with scoring (`POST /api/attempts/:id/submit`)
- Question prompts endpoint (`GET /api/attempts/:id/questions`)
- Optional training mode with immediate correctness and explanation feedback
- Explicit save-and-resume-later action from simulator
- Quick shortcut to jump to marked questions
- Text highlight toggles for question stem and individual answer options ("Highlight stem" = yellow overlay on question text)
- Simulator UI at `/exams/[slug]`

### Admin Dashboard (at `/dashboard`, login as admin)
- Revenue, subscriptions, expiring, failed payments, recent attempts metrics
- **15-tab admin UI**: Overview, Products, Exams, Questions, Users, Orders, Vouchers, Categories, Reports, Settings, CSV Ops, Sessions, Policies, Versions, Audit
- Product CRUD: create products, toggle visibility; **auto-generated slug from title** (no manual entry needed)
- Product filtering: search by title, filter by category/visibility, sortable columns (click to toggle asc/desc)
- Cross-tab navigation: "Tests" count column in Products links to Tests tab filtered by that product
- Exam builder: create exams, attach questions, set time limits and pass thresholds, toggle status; **auto-generated slug**
- Cross-tab navigation: "View Questions" button in Tests links to Questions tab filtered by that test
- Question CRUD: list/create/delete individual questions with category and explanation support
- **Cascading question filters**: Exam (Product) → Test → Status → ECO Domain → Performance Domain dropdowns
- **Domain autocomplete**: ECO Domain and Performance Domain inputs with datalist suggestions from domain tables + existing values
- **Answer badge visibility fix**: dark background badge for correct answer column
- **Image upload**: direct API call to bypass proxy limitations (max 5 MB)
- User management: list users, view details, suspend/reactivate accounts
- Order management: view orders, manual reconciliation with audit reason
- Enrollment extension with reason logging
- Voucher management: create fixed/percentage vouchers with validity and usage limits
- Category management: create and list question categories
- Reporting: sales by period/product, enrollment counts, attempt completion rates
- Report CSV export (`GET /api/admin/reports/{sales|enrollments|attempts}?format=csv`)
- Platform settings page + API (`GET/PUT /api/admin/settings`)
- CSV question export (`GET /api/admin/questions/export?examSlug=...`)
- CSV import preview with row-level diff (added/changed/removed/unchanged) (`POST /api/admin/questions/import/preview`)
- Apply previewed import (`POST /api/admin/questions/import/apply`)
- Legacy direct import (`POST /api/admin/questions/import`)
- Question version history listing (`GET /api/admin/questions/versions?examSlug=...`)
- Rollback to previous question version (`POST /api/admin/questions/rollback`)
- Question types: single choice, multiple response, true/false — conditional form rendering
- Question draft/published workflow — status dropdown with color badges, published-only filter for students
- Role-based access: 5-tier roles (student, admin, super_admin, content_admin, support_admin) with `requireRole` middleware
- Admin role management: role dropdown per user (super_admin only), color-coded badges, audit logged
- Active session management with revoke
- Per-user session policy controls (max sessions, TTL override)
- Audit log listing (`GET /api/admin/audit-logs`)

### Domain Tagging System
- Questions have `tag` (ECO Domain) and `category` (Performance Domain) columns for analytics
- Admin can set eco_domain/performance_domain via question form or CSV import
- See `docs/DOMAIN-TAGGING.md` for full documentation

### Practice Test Content
- **PMP** (product_id=13): 3 tests × 30 questions = 90 questions (`infra/docker/mysql/init/010_pmp_practice_tests.sql`)
  - ECO: People (31), Process (45), Business Environment (14)
  - Performance: Team, Planning, Delivery, Project Work, Stakeholders, Measurement, Uncertainty, Development Approach
- **CAPM** (product_id=14): 3 tests × 10 questions = 30 questions (`infra/docker/mysql/init/012_capm_practice_tests.sql`)
  - ECO: People (8), Process (17), Business Environment (5)
  - Performance: Project Management Fundamentals, Predictive Methodologies, Agile Frameworks, Business Analysis
- **Test seed data**: `infra/docker/mysql/init/011_seed_test7_attempts.sql` — 12 submitted attempts for test7@gmail.com with score progression 50%→97%

### Database (16 tables)
- Bootstrap (`001_schema.sql`): users, products, exams, questions, orders, payment_events, enrollments, audit_logs, vouchers, voucher_redemptions, categories
- Runtime (`db.ts`): attempts, auth_sessions, user_session_policies, question_import_batches, question_versions, password_reset_tokens, app_settings

## Demo Flow

1. Sign in at `http://localhost:3000/login` with `student@example.com` / `demo12345`.
2. Open `http://localhost:3000/checkout?product=pmp-exam-prep` and create a pending order.
3. Complete the mock payment callback from the checkout page to activate access.
4. Go to **My Exams** — see your purchased products and click into a practice test.
5. The exam auto-starts immediately — answer questions, use timer, flag for review.
6. After submitting, review your answers at the results page.
7. Visit **Performance** to see analytics: score trends, domain breakdowns, strongest/weakest areas.
8. Admin panel: sign in with `admin@example.com` / `admin12345`, navigate to `/dashboard`.

### Test Account with Pre-seeded Data
- `test7@gmail.com` / `demo12345` — has PMP + CAPM enrollments and 12 submitted PMP attempts for Performance Analytics demo.

## Demo Accounts

- Student: `student@example.com` / `demo12345`
- Admin: `admin@example.com` / `admin12345`

## Not Yet Implemented (Remaining Gaps)

These features are specified in `plan-customPracticeExamSimulator.prompt.md` or identified from PMTraining reference but not yet built:

### Student Portal — Dashboard Enhancements (Medium Priority)
- Category/domain recommendation insight ("Category to work on: Z")

### Simulator Enhancements (Medium Priority)
- Advanced free-text highlight persistence (selection-based highlight)

### Admin Backoffice
- Role-based admin tiers (Super Admin, Content Admin, Support Admin) — not yet enforced per-tab

### Question Types
- Rich custom types with custom renderer

### Cart & Payments
- Multi-item cart (`POST/GET/DELETE /cart/*`) — using direct checkout instead
- Checkout preview
- Real payment gateway integration (iPay88) — mock only
- Real payment signature verification

### Content Pages (Low Priority)
- Video tutorials / on-demand courses section (currently static tutorial page)

### Other
- Touch 'n Go / Apple Pay payment integration (requires ToyyibPay FPX Online Banking or Stripe)
- More practice questions (target: 1,000-question bank for PMP, expand CAPM to 30 per test)
