# PM Exam Pro — Second-Round Fix Verification Audit

**Audit date:** 7 September 2026  
**Environment:** Live production (`https://www.pmexampro.com`) plus source-code and automated-test review  
**Payment scope:** Excluded by instruction. No checkout was submitted and no payment gateway was called.  
**Overall result:** **Partial pass — the first-round learner experience is materially better, but the analytics/readiness model and free preview still have release-significant defects.**

## 1. Executive verdict

The public journey, registration form, maintenance-off behavior, development-code removal, responsive layout, and basic simulator preview are improved and working. Production health, MySQL, and Redis were healthy during the audit. The old UAT codes were rejected by the live registration API.

The Performance dashboard is **more useful than before** because it is product-scoped, uses each exam's configured pass threshold, distinguishes ECO from Delivery Approach, shows recent performance, first-seen accuracy, coverage, consistency, unanswered rate, recurring mistakes, and recommended next steps, and avoids presenting the readiness number as an official PMI result.

It is **not yet reliable enough to guide actual-exam readiness**. Its eligibility and weighting can be inflated by repeating a short exam; coverage is measured only against exams already attempted rather than the whole selected product; first-seen accuracy is displayed but omitted from the readiness score; and production classification data is too fragmented to support meaningful domain advice.

## 2. What was tested

- Live health and maintenance status.
- Anonymous homepage, catalog, product details, login, registration, FAQ, tutorial, privacy, terms, and protected-route behavior.
- PMP product and exam APIs, all published exam counts, and free-preview simulator.
- Full five-question preview flow: start, answer, auto-forward, review, confirmation, submit, score, retry, and full-access CTA.
- Desktop at 1440 × 900 and mobile at 320 × 700.
- Horizontal overflow, broken images, browser page errors, failed network requests, and console errors.
- Registration field requirements and password wording.
- Rejection of former four- and six-digit UAT codes in production using a non-routable test address; no user was created.
- Anonymous protection for learner dashboard and performance routes.
- Source review of onboarding, simulator, analytics calculations, email templates, zero-question controls, and branding.
- Read-only production aggregates for question type, ECO classification, Delivery Approach, and published question counts.
- API tests, repository typecheck, and production-copy check.
- Production PM2 error/output logs after the browser run.

Not tested in this round:

- Payment or any gateway callback, by instruction.
- Receipt generation tied to a new purchase.
- Actual delivery to an email inbox. Templates were inspected, but no verification or reset email was requested.
- A live authenticated learner attempt and rendered Performance dashboard. Both documented QA learner accounts correctly no longer exist after the production reset. No user or enrollment was injected directly into production to bypass registration.
- Maintenance allow-list behavior while maintenance is enabled. Maintenance was left off to avoid disrupting visitors.

## 3. Verification matrix

| Area | Result | Evidence / note |
|---|---|---|
| Production health | Pass | `/health` returned 200 with database healthy and Redis ready. |
| Maintenance currently off | Pass | `/api/maintenance-status` returned `maintenanceMode: false`; homepage returned 200. |
| Old UAT registration codes | Pass | `1111` failed schema validation; `111111` returned “Invalid verification code.” No account was created. |
| Registration fields | Pass | Only full name, email, password, six-digit verification code, and terms/privacy consent are required. Demographics are absent. |
| Password consistency | Pass with coverage gap | Shared policy requires at least eight characters with a letter and number. API regression test passes. No browser test currently compares every password screen. |
| Anonymous protected routes | Pass | `/me/dashboard` and `/me/performance` finished at `/login?next=...` on desktop and mobile. |
| Free preview entry | Pass | Product page exposes “Try free preview”; preview is explicitly separate from stored statistics. |
| Free preview basic completion | Pass | Five questions could be answered, reviewed, confirmed, submitted, and scored without creating an attempt. |
| Free preview multiple-response | **Fail** | Preview permits one selected option only and omits option E/type metadata. See A-01. |
| Preview content protection | **Fail** | Five random questions, correct answers, and explanations are public on every request. See A-02. |
| Mobile layout | Pass for audited routes | No horizontal overflow or broken images at 320 px. Mobile menu opened and reported `aria-expanded=true`. |
| Zero-question start guard | Pass by source review | Public/admin start controls require a positive published question count. No zero-question published exam exists in production for a live negative-path test. |
| Simulator save/review controls | Partial | The preview navigation/review/submit path passed. Paid autosave, resume, training feedback, timeout submission, and full attempt statistics need an authenticated QA learner. |
| Brand rename | **Fail** | Live database descriptions still say “PM Advance”; administrator welcome email still says “PMP Practice Exam Simulator.” See B-01. |
| Performance product scoping | Pass by source review | API filters attempts using the selected product slug. |
| Dynamic pass thresholds | Pass by source review | Attempt pass/fail uses each exam's configured threshold. |
| Training-mode isolation | **Fail** | Training answers feed ECO/Delivery Approach aggregates and therefore 20% of readiness. |
| Readiness usefulness | **Partial / not trustworthy yet** | Better presentation and useful directional metrics, but eligibility, coverage, classification, and weighting defects remain. |
| Automated checks | Partial | API 11/11 tests passed; all typechecks passed; production-copy scan passed. No readiness calculation tests exist. |

## 4. Newly found defects and improvements

### A-01 — Critical: multiple-response questions cannot work in the free preview

Production has **39 multiple-response questions**, and all 39 have option E. The preview API returns only A–D and does not return `questionType`. The preview state stores one string per question, so the learner can select only one answer. A question displaying “Choose two” can never be answered correctly.

**Fix:** Return `questionType` and all populated A–E options. Reuse the full simulator's normalized multi-select and order-independent scoring in the trial. Add a browser test covering a two-answer question, deselection, review, and score.

### A-02 — High: the paid question bank is scrapeable through the public preview API

Every anonymous request to an exam detail endpoint selects five random published questions and returns their correct answers and explanations. Reloading produced different questions during this audit. Repetition can reveal a large portion of the paid bank without an account.

**Fix:** Mark a small, approved preview set per exam or product; return only those stable samples; rate-limit the endpoint; and avoid returning answer/explanation data until the learner submits the preview question. Monitor unusual enumeration.

### A-03 — High: coverage can reach 100% after only a narrow part of a product

Coverage is calculated as unique answered questions divided by published questions in **exams the learner has already attempted**. It is not divided by every published question in the selected product.

Example: the first PMP exam has 21 questions, while the PMP product has 122 published questions. Answering that one exam can display 100% coverage even though actual product coverage is about 17%. Two repeats can then satisfy readiness eligibility.

**Fix:** Use all readiness-eligible published questions in the selected product as the denominator, and separately show exam coverage and official-blueprint coverage.

### A-04 — High: short and repeated attempts can unlock and inflate readiness

Readiness appears after two exam-mode attempts plus 25% of the flawed coverage denominator. Attempts do not have to be distinct, fresh, full-length, or comparable. The weighted recent score contributes 45%, while repeated questions are not discounted. First-seen accuracy is displayed but contributes 0% to readiness.

Training attempts are excluded from recent score and attempt count, but their answers are included in the ECO and Delivery Approach aggregates. The resulting domain-balance value contributes 20% of readiness. Since training mode reveals immediate feedback, it can inflate the result.

**Fix:** Require at least two comparable full simulations, minimum unique-question and blueprint coverage, and sufficient first-seen evidence. Either make first-seen/smoothed mastery a major component or label the number as a simple practice-activity score rather than readiness.

### A-05 — High: production ECO data is not domain-level data

The database has 75 CAPM and 122 PMP published questions. CAPM contains 53 distinct ECO values and PMP contains 86. Leading values include codes such as `2.3`, `1.2`, `2.3.1`, `4.6.2`, and `II.3`. These appear to be mixed task/subtask codes, not clean domain names, but the UI groups them as “ECO Domain.” This creates dozens of tiny rows and feeds an unreliable domain-balance component.

**Fix:** Introduce controlled, certification- and version-specific fields: `eco_domain`, `eco_task`, optional enabler, and effective blueprint version. Map and validate every published question. Do not include unmapped or ambiguous data in readiness.

### A-06 — High: Delivery Approach coverage is incomplete

Delivery Approach is useful because it answers a different question from ECO: ECO identifies **what competency is tested**, while Delivery Approach identifies **the operating context**—Predictive, Agile/Adaptive, Hybrid, or Agnostic. This helps a learner detect, for example, strong Process knowledge but weak judgment in hybrid scenarios.

Production has four sensible approach values, but 25 of 122 PMP questions have no approach. Missing values reduce trust and can distort comparisons.

**Fix:** Require a controlled Delivery Approach for every readiness-eligible question and show sample size/coverage beside each result.

### A-07 — Medium: readiness weighting and labels are inconsistent

- Domain balance equally averages each group percentage rather than weighting by blueprint or sample confidence.
- “Consistency” uses `100 - standard deviation × 3`, an undocumented product-specific formula.
- Domain ranking uses 65%/80%, recommendations use 75%, and exams currently use a 70% practice threshold.
- “Best Score” and pass rate remain prominent even though retakes can inflate them.
- Recurring mistakes is only a count; the learner cannot open the affected concepts/questions or take the recommended action.

**Fix:** Publish one coherent coaching-band model, show the evidence behind each result, and link every recommendation to review or focused practice.

### A-08 — Medium: simulator timing cannot support pacing or stamina analysis

Published tests contain 21–50 questions but are all configured for 180 minutes. The dashboard records no question-level timing, break behavior, pacing by section, or stamina change. The product page nevertheless describes the simulator as matching the actual exam standard.

**Fix:** Define test types explicitly (`quiz`, `section practice`, `full simulation`), give each an appropriate time model, and allow only comparable full simulations to contribute to pacing/stamina readiness.

### B-01 — High: legacy branding remains in production data and emails

- Both live catalog descriptions still contain “PM Advance.”
- Administrator-created-user welcome emails use “PMP Practice Exam Simulator” in the subject and body instead of “PM Exam Pro.”
- Public support/privacy addresses use `pmadvance.com` / `pmadvance.com.my`. These may be intentional mailboxes, but they visually preserve the old identity and should be confirmed with the client.

The current production-copy script scans source text case-sensitively and cannot inspect database-managed content, so it passed despite the live defect.

**Fix:** Clean the two database descriptions, update administrator welcome templates, agree on PM Exam Pro support addresses or explicitly approve the legacy domains, and add a deployment-time database content scan.

### B-02 — Medium: catalog promises do not match the current inventory

The PMP description claims a 1,000-question bank, but 122 PMP questions are currently published. The homepage advertises PMP, CAPM, PMI-RMP, and PMI-ACP selection, while only PMP and CAPM packs are present. Copy also says “exact logic,” “actual PMI exam standard,” and “walk out certified,” which is stronger than the available evidence supports.

**Fix:** Make claims dynamic or align them with the current inventory; soften unverified equivalence/pass-outcome claims; obtain client/legal approval for PMI/ATP wording.

### B-03 — Medium: optional onboarding “Skip for now” is not remembered

`needsOnboarding` is true whenever age, occupation, and gender are all empty. “Skip for now” only navigates away and stores no completion/skip flag. A learner who prefers not to provide demographics is redirected back after every future login. Saving only certification/exam date also does not satisfy the condition.

**Fix:** Add `onboarding_completed_at` or `onboarding_skipped_at`; set it on either action; allow the learner to edit optional data later in Account.

### B-04 — Medium: production API still emits double-response errors

Two fresh `ERR_HTTP_HEADERS_SENT` entries appeared during the browser audit at 23:42:48 and 23:43:09. The global error handler sends JSON without first checking `response.headersSent`, so an error raised after a response has begun creates a second error and obscures the original cause.

**Fix:** If headers were sent, delegate to `next(error)`; otherwise send the JSON error. Log the original route, method, request ID, and stack. Re-run the public navigation suite to identify the initiating request.

### B-05 — Low: anonymous browsing creates avoidable 401 noise

Public pages repeatedly probe `/api/auth/me`, enrollment, and token refresh, producing two to four expected 401 responses per navigation and browser-console errors. This complicates real incident detection and adds requests.

**Fix:** Use a lightweight non-error session-status response, avoid refresh when no refresh cookie exists, and do not request learner-only resources until authentication is known.

### B-06 — Low: preview framing is confusing

Before the one-minute trial starts, the page says “Exam In Progress” and displays the full exam's `03:00:00` timer. The nested preview then displays its separate one-minute timer.

**Fix:** Use “Exam preview” before a tracked attempt starts and hide the full-exam timer from anonymous preview users.

### B-07 — Low: preview answers lack accessible selection semantics

Answer choices are buttons with visual-only selected state, no radio/checkbox group, and no `aria-pressed`/`aria-checked`. This is especially problematic once multiple-response is restored.

**Fix:** Use a labelled radiogroup for single choice and checkbox group for multiple response, with keyboard and screen-reader regression tests.

## 5. Is the Performance dashboard meaningful now?

**Yes, as a directional practice summary. No, as a dependable exam-readiness indicator.**

Useful now:

- Product-specific attempt history.
- Dynamic practice pass/fail threshold.
- Recent-score trend.
- First-seen accuracy as a visible anti-memorization signal.
- Unique-question, unanswered, consistency, and recurring-error prompts.
- Separate ECO and Delivery Approach views.
- Clear disclaimer that the score is not an official or guaranteed certification outcome.

Not dependable yet:

- The coverage denominator is wrong for product readiness.
- Two repeats of one short exam can unlock the score, and training answers can inflate its domain component.
- First-seen accuracy does not affect the score.
- ECO classification is fragmented task-code data.
- Missing Delivery Approach data affects 25 PMP questions.
- No pacing, stamina, confidence calibration, or retention evidence exists.
- No automated tests validate readiness calculations with fixed fixtures.

The safest interim UI is to keep the component but call it **Practice Progress** or **Readiness Evidence**, hide the composite number, and show the component metrics with “building evidence” until the data model and eligibility rules are corrected.

## 6. Recommended learner metrics

1. **Next best action:** one direct link to resume, review recurring errors, practise a weak ECO task, or take a fresh simulation.
2. **First-seen accuracy:** correct first response ÷ first-seen questions, with sample size.
3. **Smoothed ECO mastery:** controlled domain/task mapping plus an evidence/confidence label.
4. **Product and blueprint coverage:** unique questions and official weighting, both visible.
5. **Repeat share and retention:** distinguish memorized retakes from later recall after a delay.
6. **Pacing:** time per question/section, late rushing, unanswered-at-timeout, and time remaining.
7. **Stamina:** compare early, middle, and late accuracy on full simulations.
8. **Consistency:** variation across comparable fresh full simulations, with an explanation in plain language.
9. **Confidence calibration:** where captured, confidently wrong answers should become the highest-priority review items.
10. **Readiness band:** only after eligibility is met; transparently show contributing evidence and never claim a guaranteed PMI outcome.

## 7. Suggested next regression tests

### Automated API/calculation fixtures

- Product coverage when only one of several exams was attempted.
- Repeating the same short test must not unlock readiness.
- Training-mode answers must not contribute to exam-readiness components.
- First-seen accuracy and repeat share across reordered attempts.
- Removed/unpublished/versioned questions must not rewrite historical truth.
- Multiple-response order-independent scoring in trial and tracked attempt.
- ECO mapping by certification/version and exclusion of unmapped questions.
- Delivery Approach missing-value validation.
- Weighted recent score, smoothed mastery, consistency, unanswered rate, and confidence bands.
- Zero-question public/admin/attempt negative paths.
- Production UAT-code non-disclosure and rejection.
- Error middleware behavior after headers have been sent.

### Browser journeys

- Registration → verification → optional onboarding save and permanent skip → logout/login.
- Full paid exam-mode attempt with autosave, refresh/resume, review filters, submit, result, and history.
- Training mode on single- and multiple-response questions.
- Network offline/online recovery and failed-save retry.
- Timer expiry, tab switching, fullscreen, keyboard-only use, and screen reader labels.
- Mobile 320/375/390 px and desktop Chrome, Safari, Firefox, and Edge.
- Dashboard datasets: new learner, one attempt, repeated attempt, two different full simulations, expired enrollment, and multiple products.
- Stable curated preview and anti-enumeration/rate-limit behavior.

## 8. Priority order

1. Fix free-preview multi-response/option E and stop random bank exposure.
2. Correct readiness coverage and eligibility; hide or rename the composite score until corrected.
3. Normalize/version ECO and Delivery Approach data, then remap all 197 published questions.
4. Remove live legacy branding and correct welcome-email identity.
5. Persist onboarding skip/completion.
6. Fix and trace the double-response production error.
7. Align inventory, timer/test-type, and marketing claims.
8. Add authenticated browser fixtures and readiness calculation tests.

## 9. Evidence summary

- Production health: HTTP 200; database true; Redis ready.
- Products/exams: 2 packs, 7 published exams, 197 published questions.
- PMP: 122 questions across exams of 21, 26, 50, and 25 questions.
- CAPM: 75 questions across three 25-question exams.
- Question types: 158 single-choice; 39 multiple-response; all 39 multiple-response items contain option E.
- ECO values: 53 distinct within CAPM; 86 distinct within PMP.
- Delivery Approach: Agnostic 84, Agile 40, Hybrid 26, Predictive 22, missing 25.
- API tests: 11 passed, 0 failed.
- Typecheck: API, web, shared packages passed.
- Desktop/mobile audited routes: no horizontal overflow and no broken images.
- Reusable browser script: `scripts/audit-production-ui.mjs`.
