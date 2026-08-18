# Business Requirements Document (BRD)

**Project:** PM Certification Practice Exam Simulator Platform  
**Client:** Rosli Bakri, PM Advance  
**Developer:** Syahrizan Ali Hassan, NS Creative Solutions  
**Version:** 1.0  
**Date:** 17 April 2026  
**Reference:** QUOTATION-v2, SOW-QUOTATION-V2, MILESTONES-QUOTATION-V2, Missing Features Review Table

---

## 1. Executive Summary

PM Advance requires a web-based practice exam simulator platform for Project Management certification preparation (PMP, CAPM, and related credentials). The platform must provide a realistic timed exam experience with commercial checkout, student self-service, and a comprehensive admin back-office for content and business management.

---

## 2. Business Objectives

| # | Objective | Success Metric |
|---|-----------|----------------|
| BO-1 | Provide a realistic browser-based practice exam experience | Students can complete full timed exams with scoring, review, and explanations |
| BO-2 | Enable end-to-end commercial flow | Guest → Register → Pay → Immediate access within one session |
| BO-3 | Give admin team full operational control | Admin can manage products, exams, questions, users, orders, enrollments without developer |
| BO-4 | Support Malaysian payment methods | Integration with ToyyibPay (FPX/card), extensible to other gateways |
| BO-5 | Maintain architecture for Phase 2 expansion | API-first design enabling future mobile app, analytics, and new question types |

---

## 3. Stakeholders

| Role | Name / Entity | Responsibility |
|------|---------------|----------------|
| Product Owner | Rosli Bakri (PM Advance) | Requirements, content, UAT sign-off |
| Developer | Syahrizan Ali Hassan (NS Creative Solutions) | Design, development, deployment |
| End Users | Students (PMP/CAPM candidates) | Consume exams, provide feedback |
| Admin Users | PM Advance staff | Manage platform operations |

---

## 4. User Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| Guest | Unauthenticated visitor | Browse catalog, view product details, register during checkout |
| Student | Registered and authenticated user | Purchase exams, take timed attempts, review results, manage account |
| Admin | Platform administrator | Full back-office: products, exams, questions, users, orders, enrollments, reports |
| Super Admin | Senior administrator | All Admin + role management and critical settings (future phase) |

---

## 5. Functional Requirements

### 5.1 Authentication & Account Management (Module 1)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-1.1 | User can register with email, full name, and password | Must | ✅ Built |
| FR-1.2 | User can login with email and password | Must | ✅ Built |
| FR-1.3 | JWT access + refresh token rotation with cookie-based storage | Must | ✅ Built |
| FR-1.4 | Track active sessions with user-agent/IP; user can revoke sessions | Must | ✅ Built |
| FR-1.5 | Configurable max concurrent sessions and refresh TTL per user | Should | ✅ Built |
| FR-1.6 | Forgot password flow with secure reset token and email notification | Must | ✅ Built |
| FR-1.7 | Update name, email, password from account settings | Must | ✅ Built |
| FR-1.8 | Brute-force protection: rate limiting on auth endpoints (10 req/60s per IP) | Must | ✅ Built |

### 5.2 Checkout & Payment (Module 2)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.1 | Create pending orders linked to product and user | Must | ✅ Built |
| FR-2.2 | Payment gateway integration (ToyyibPay sandbox/production) | Must | ✅ Built |
| FR-2.3 | Idempotent payment callback processing (event key deduplication) | Must | ✅ Built |
| FR-2.4 | Automatic enrollment activation upon successful payment | Must | ✅ Built |
| FR-2.5 | Time-limited access (configurable days per product), expiry enforcement | Must | ✅ Built |
| FR-2.6 | Voucher/discount codes with fixed/percentage types, usage limits, validity dates | Should | ✅ Built |
| FR-2.7 | Complete checkout UI with order summary, voucher input, payment trigger | Must | ✅ Built |
| FR-2.8 | Combined guest registration + checkout in one flow | Must | ✅ Built |
| FR-2.9 | Payment result page with success/failure/pending states and polling | Must | ✅ Built |
| FR-2.10 | Payment verification via gateway API (ToyyibPay getBillTransactions) when callback is unreachable | Should | ✅ Built |

### 5.3 Exam Simulator Engine (Module 3)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-3.1 | Only enrolled students can start exam attempts | Must | ✅ Built |
| FR-3.2 | Countdown timer with visual warning when < 5 minutes remaining | Must | ✅ Built |
| FR-3.3 | Automatic submission when timer reaches zero | Must | ✅ Built |
| FR-3.4 | Single-choice question rendering with radio button options | Must | ✅ Built |
| FR-3.5 | Real-time answer persistence with 500ms debounce auto-save | Must | ✅ Built |
| FR-3.6 | Flag individual questions for later review (yellow indicator) | Must | ✅ Built |
| FR-3.7 | Toggle strikethrough on individual answer options | Must | ✅ Built |
| FR-3.8 | Numbered question grid with jump-to and color-coded status | Must | ✅ Built |
| FR-3.9 | Pre-submit review screen showing all questions with status | Must | ✅ Built |
| FR-3.10 | Automatic scoring on submission with pass/fail determination | Must | ✅ Built |
| FR-3.11 | Training mode: immediate correct answer + explanation after each question | Should | ✅ Built |
| FR-3.12 | Save & Resume: explicit save button + auto-save for later continuation | Should | ✅ Built |
| FR-3.13 | Quick-filter to view only flagged questions during exam | Could | ✅ Built |
| FR-3.14 | Text highlight in question stem and per-option highlight toggle | Could | ✅ Built |
| FR-3.15 | Question randomisation: deterministic per-attempt shuffle using seeded Fisher-Yates (mulberry32 PRNG) | Should | ✅ Built |
| FR-3.16 | Anti-cheating: copy/cut/paste/right-click blocked during exam; tab-switch detection with counter and warning | Should | ✅ Built |
| FR-3.17 | Auto-advance to next question 350ms after selecting an answer (skipped in training mode) | Could | ✅ Built |
| FR-3.18 | Auto-resume: detect and reload in-progress attempt when opening exam page | Should | ✅ Built |

### 5.4 Student Portal (Module 4)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-4.1 | Dashboard with active subscriptions, expiry dates, quick actions | Must | ✅ Built |
| FR-4.2 | Dashboard summary: completed tests count, in-progress count | Must | ✅ Built |
| FR-4.3 | Smart summary: "Last test: X, scored Y%", "Category to work on: Z" | Should | ✅ Built |
| FR-4.4 | Dropdown to filter dashboard by certification type | Should | ✅ Built |
| FR-4.5 | List all past attempts with date, score, pass/fail status | Must | ✅ Built |
| FR-4.6 | Per-question review with color-coded correct/incorrect, explanations | Must | ✅ Built |
| FR-4.7 | Resume unfinished exams from dashboard | Must | ✅ Built |
| FR-4.8 | Profile update and password change page | Must | ✅ Built |
| FR-4.9 | View all past orders and payment status | Should | ✅ Built |
| FR-4.10 | Dedicated layout with branded navbar and authenticated routing | Must | ✅ Built |

### 5.5 Admin Back-Office (Module 5)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-5.1 | Separate admin login with role validation and auth guard | Must | ✅ Built |
| FR-5.2 | Overview dashboard: revenue, active subs, expiring, failed payments | Must | ✅ Built |
| FR-5.3 | Product CRUD with visibility toggle | Must | ✅ Built |
| FR-5.4 | Exam builder with question attachment, time limits, pass thresholds | Must | ✅ Built |
| FR-5.5 | Question CRUD with category and explanation support | Must | ✅ Built |
| FR-5.6 | CSV import with preview diff and apply; CSV export | Must | ✅ Built |
| FR-5.7 | Question version history and rollback | Should | ✅ Built |
| FR-5.8 | User management: list, view details, suspend/reactivate | Must | ✅ Built |
| FR-5.9 | Order management: view orders, manual reconciliation with audit reason | Must | ✅ Built |
| FR-5.10 | Enrollment management: extend access with reason logging | Must | ✅ Built |
| FR-5.11 | Voucher management: create fixed/percentage with limits | Should | ✅ Built |
| FR-5.12 | Category management: create and list categories | Should | ✅ Built |
| FR-5.13 | Reporting: sales by period/product, enrollment counts, attempt rates | Should | ✅ Built |
| FR-5.14 | Session management: view and revoke active user sessions | Should | ✅ Built |
| FR-5.15 | Per-user session policy configuration | Could | ✅ Built |
| FR-5.16 | Searchable audit trail for admin-sensitive actions | Must | ✅ Built |

### 5.6 Database & Infrastructure (Module 6)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-6.1 | 17+ table relational schema | Must | ✅ Built |
| FR-6.2 | Demo seed data: users, products, exams with questions | Must | ✅ Built |
| FR-6.3 | Redis integration for caching and rate limiting | Should | ✅ Built |
| FR-6.4 | Modular Express API with 14 route modules and Zod validation | Must | ✅ Built |

---

## 6. Client-Requested Additional Features (Review Table)

Features from the client's "Missing or Overlooked Features" review:

| ID | Feature | Category | Priority | Decision |
|----|---------|----------|----------|----------|
| CF-1 | Calculator tool (on-screen calculator) | Simulator | Could | Phase 2 — add-on |
| CF-2 | Exhibit/image support in questions (charts/tables/diagrams) | Simulator | Should | Phase 2 — requires file storage |
| CF-3 | Question randomisation (shuffle questions and answers per attempt) | Simulator | Should | ✅ Implemented — seeded Fisher-Yates shuffle (mulberry32 PRNG) |
| CF-4 | Performance trend charts across multiple attempts | Student Portal | Should | Phase 2 — analytics module |
| CF-5 | Domain/topic weakness analysis with topic/subtopic tagging | Student Portal | Should | Phase 2 — requires ECO tagging |
| CF-6 | Countdown to exam date | Student Portal | Could | Phase 2 — minor add-on |
| CF-7 | Bulk user management (import/enrol multiple students) | Admin | Could | Phase 2 — corporate feature |
| CF-8 | Manual enrollment without payment (corporate invoicing flow) | Admin | Should | Phase 2 — enterprise feature |
| CF-9 | Coupon/promo code analytics (usage reporting) | Admin | Could | Can enhance existing voucher reports |
| CF-10 | Question tagging by topic/subtopic (ECO-level granularity) | Admin | Should | Phase 2 — schema extension |
| CF-11 | Referral/affiliate system | Business | Could | Phase 2 — marketing module |
| CF-12 | Free trial/guest exam mode (5-10 questions before buying) | Business | Should | Phase 2 — lead generation |
| CF-13 | Social sharing of score results | Business | Could | Phase 2 — minor add-on |
| CF-14 | Anti-cheating measures (copy-paste, right-click, tab-switch detection) | Security | Should | ✅ Implemented — copy/cut/paste/right-click blocked; tab-switch counter with warning |
| CF-15 | PDPA compliance coverage for Malaysia | Security | Must | Add privacy policy + data handling |
| CF-16 | Live chat support widget (e.g., Tawk.to integration) | Others | Could | Phase 2 — third-party embed |
| CF-17 | API for PMI question import (future licensing readiness) | Others | Could | Phase 2 — API extension |

---

## 7. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Response time | API responses < 500ms for standard queries |
| NFR-2 | Concurrent users | Support 80–150 concurrent users on recommended VPS |
| NFR-3 | Availability | 99.5% uptime on production |
| NFR-4 | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-5 | Responsive design | Desktop-first with responsive baseline for tablet/mobile |
| NFR-6 | Security | OWASP Top 10 compliance, bcrypt password hashing, HTTPS only |
| NFR-7 | Data protection | PDPA-aware data handling (Malaysian privacy law) |
| NFR-8 | Scalability | API-first architecture for future mobile app and additional services |

---

## 8. Constraints

| Constraint | Detail |
|------------|--------|
| Budget | RM 15,000 total (40/30/30 split) |
| Timeline | 5-6 weeks build + 10-11 weeks calendar with client buffers |
| Technology | Next.js, Express, MySQL 8, Redis 7, Bootstrap 5 |
| Hosting | Client-provided Linux VPS (Exabytes recommended) |
| Content | Client provides all exam questions and educational material |
| Payment | ToyyibPay (Malaysian gateway); extensible to others |

---

## 9. Assumptions

1. Client provides exam content, branding assets, and gateway credentials on time.
2. Client feedback is provided within each 1-week buffer window.
3. UAT is coordinated by client stakeholders within the planned UAT week.
4. Single-choice questions only in MVP; multi-response is Phase 2.
5. Desktop-first design with responsive baseline; full mobile optimization is Phase 2.

---

## 10. Out of Scope (Current Phase)

1. Native mobile app (iOS/Android)
2. Custom exam builder for students
3. Advanced analytics with predictive insights
4. Video tutorials and LMS content
5. Complex question types (drag-drop, matching, hotspot)
6. Full mobile-first optimization
7. Multi-language support
8. Advanced role hierarchy (Content Admin, Support Admin)
