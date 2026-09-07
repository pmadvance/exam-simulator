# PM Exam Pro First-Round Audit Fix Plan

**Prepared:** 7 September 2026  
**Status:** Approved and implemented for the first remediation release; see `FIRST-ROUND-REMEDIATION-REPORT.md` for verification and remaining dependencies.
**Source documents:**

- `docs/PRODUCTION-E2E-QA-AUDIT-2026-09-07.md`
- `docs/CLIENT-JOURNEY-UX-REVIEW-2026-09-07.md`

## 1. Objective

Complete the first remediation round from both audit documents, including the client journey and UX recommendations. The intended result is a production-safe, consistently branded customer journey; a simulator without known dead ends; accurate, actionable learner analytics; improved mobile and accessible behavior; and regression protection for each corrected issue.

Payment behavior is explicitly deferred for this round. Branding text that appears in receipts or notifications remains in scope, but gateway integration, callback logic, amounts, fees, merchant identity, and payment reconciliation will not be changed.

## 2. Approval boundary

This document is the proposed work scope. Before approval, work is limited to documenting and reviewing the plan. After approval, implementation will proceed in focused phases and commits, followed by local verification and a separate production deployment checkpoint.

## 3. Explicitly deferred payment work

The following findings remain open and will not be modified in this round:

- ToyyibPay callback authentication and server-to-server verification
- Plus-address rejection and orphaned checkout/order behavior
- ToyyibPay merchant identity and contact details
- Gateway fees and pre-redirect final-price disclosure
- `toyyibpay-undefined-*` transaction references
- Charged MYR amount and fee reconciliation on receipts
- Payment failure, pending, refund, duplicate, and delayed-callback behavior
- New purchase-confirmation behavior coupled to payment finalization

Payment security remains a critical unresolved launch risk even though it is deferred by instruction.

## 4. Phase A — Baseline and protection of existing fixes

### Tasks

- Review the user's existing fixes for question counts, results, analytics, account, privacy, receipts, and logout.
- Compare local code, `origin/main`, and the Exabytes revision.
- Capture current route, schema, and test behavior before editing.
- Identify dirty or user-owned changes and preserve them.
- Add regression fixtures for existing corrected behavior before structural analytics work.

### Acceptance criteria

- Existing fixes are documented as retained, superseded, or incomplete.
- No working fix is accidentally reverted.
- The starting commit and production revision are recorded.

## 5. Phase B — Remove development and UAT traces

### Tasks

- Remove “use code 111111 for UAT testing” from production registration and checkout.
- Search UI, API responses, templates, seed content, metadata, logs, and built assets for:
  - UAT verification codes
  - test credentials
  - development-only instructions
  - debug output
  - placeholder text
  - sandbox/development controls shown to customers
- Keep required developer helpers behind server-controlled environment checks.
- Ensure a client-provided browser value cannot enable development helpers.
- Add a production-rendering regression test for prohibited strings.

### Acceptance criteria

- No UAT code or development instruction is visible in a production build.
- UAT behavior remains usable only when explicitly enabled outside production.
- A repository and built-output scan finds no exposed credentials or test codes.

## 6. Phase C — Standardize PM Exam Pro branding

### Tasks

- Replace customer-facing `PMAdvance`, `PM Advance`, and inconsistent variations with `PM Exam Pro` throughout:
  - public site
  - authenticated learner pages
  - administration pages
  - navigation and footers
  - page titles and metadata
  - verification email
  - password-reset email
  - access-expiry email or notifications
  - receipt presentation
  - success, error, and support messages
- Update the default email sender display name to PM Exam Pro.
- Search generated/built output after compilation to catch indirect or stale occurrences.
- Preserve technical identifiers only where renaming would break infrastructure, database keys, domains, or historical integrations; document any such exception.

### Acceptance criteria

- Customer-visible system and email wording consistently says PM Exam Pro.
- No customer-facing PMAdvance/PM Advance occurrence remains.
- Verification and reset emails use the PM Exam Pro name, colors, URL, support identity, and clear expiry/security wording.

## 7. Phase D — Registration, password policy, and onboarding

### Tasks

- Create one shared password policy used by registration, password change, checkout registration, API validation, helper text, and tests.
- Require at least eight characters containing at least one letter and one number.
- Return the same validation message from client and server.
- Remove age, occupation, and gender from initial registration/checkout.
- Add optional post-registration onboarding:
  - age
  - occupation
  - gender
  - target certification
  - planned exam date
- Include Skip and Complete Later actions.
- Retain optional demographic editing under My Account.
- Ensure onboarding does not block login, enrollment, payment return, dashboard, or exam access.
- Ensure consent collection and versions remain part of required registration.

### Acceptance criteria

- The same password is accepted or rejected consistently everywhere.
- Checkout registration contains only essential account and consent fields.
- Users can skip optional onboarding without losing access.
- Optional data persists correctly when supplied and remains editable later.

## 8. Phase E — Catalog accuracy and zero-question protection

### Tasks

- Verify the already-corrected published-question counts.
- Hide Start Exam and Free Preview when an exam has no published questions.
- Display “Questions coming soon” or an equivalent approved empty state.
- Reject attempt creation for zero-question exams at the API level.
- Prevent administrators from publishing an exam with no published questions.
- Warn administrators before unpublishing the final published question in a live exam.
- Remove or safely close existing zero-question in-progress attempts.
- Replace fixed “1,000+ question” wording with:
  - a dynamically calculated published-question count, or
  - approved non-numeric copy until the promised inventory exists.
- Ensure draft questions never affect public counts, previews, attempts, or result reviews.

### Acceptance criteria

- A zero-question exam cannot be started through either UI or API.
- No unusable exam appears to offer a test or preview.
- All public counts exactly match published content.
- Draft-only content cannot leak to students.

## 9. Phase F — Simulator UX and correctness

### Training Mode

- Remove the broken Review Answers action after a deleted/non-persistent training attempt, or persist a safe non-scored review snapshot.
- Use clear completion actions: Continue Training, Retake, My Exams, and Dashboard as appropriate.
- Ensure training attempts never inflate exam-mode analytics.

### Preview

- Label the experience explicitly as “5-question preview · 1-minute demo.”
- Separate preview duration from the full exam's metadata.
- Ensure free previews never contribute to paid learner statistics.

### Controls and onboarding

- Replace isolated `S` and `H` controls with understandable Strikethrough and Highlight controls, using accessible icons/text.
- Add a first-use guide for:
  - Training Mode
  - auto-forward
  - strikethrough
  - highlighting
  - marking for review
  - review filters
  - Save and Exit
- Allow the guide to be dismissed and reopened.

### Focus and mobile experience

- Introduce a focused simulator shell with reduced non-exam navigation.
- Build a compact sticky mobile toolbar containing question number, timer, Save, and End.
- Keep the current question and primary answers near the top of the mobile viewport.
- Preserve responsive behavior without horizontal overflow.

### State and failure handling

- Display explicit Saving, Saved, Offline, Save Failed, Session Expired, and Reconnected states.
- Retry safe progress writes after temporary network failure.
- Warn before leaving with unsaved progress.
- Document what occurs at time expiry and submit automatically using server-authoritative time.
- Preserve answer, mark, highlight, and current-position state across refresh/resume as intended.

### Dialog accessibility

- Move focus into confirmation dialogs.
- Trap focus while open.
- Close on Escape where safe.
- Prevent assistive technologies from interacting with background content.
- Restore focus to the triggering control after cancellation.
- Announce unanswered count and submission state.

### Acceptance criteria

- Training completion has no dead link.
- Preview timing is unambiguous.
- Every simulator tool is understandable with mouse, touch, keyboard, and screen reader.
- Mobile test-taking is compact and usable.
- Save/resume and time-expiry behavior survive automated regression tests.

## 10. Phase G — Results and analytics correctness

### Tasks

- Verify and retain the user's existing results/analytics fixes.
- Filter attempts and every aggregate by the selected product/certification.
- Calculate pass/fail using each exam's configured practice threshold everywhere.
- Remove fixed 65% logic.
- Compare multiple-response answers as normalized sets, independent of selection order.
- Apply the same scoring logic to:
  - submission result
  - detailed review
  - dashboard
  - domain analytics
  - reports
- Replace ambiguous “3 / 18 Correct / Incorrect” wording with separately labelled counts.
- Consolidate or clearly differentiate Overall and Trends tabs.
- Exclude training, preview, draft, and zero-question attempts from normal analytics.
- Ensure result review queries only the exact published/versioned questions included in the attempt.

### Acceptance criteria

- PMP and CAPM figures remain completely separate.
- Known fixtures produce identical scores in all views.
- Multiple-response selection order cannot change correctness.
- Result review cannot expose draft or unrelated questions.

## 11. Phase H — ECO, task, delivery-approach, and performance-domain model

### Required terminology

- **ECO domain:** official certification exam area
- **ECO task/objective:** specific capability beneath an ECO domain
- **Delivery approach:** predictive, adaptive/agile, hybrid, or agnostic
- **PMBOK performance domain:** optional secondary learning classification

Agile, Hybrid, Predictive, and Agnostic will be renamed from “Performance Domain” to “Delivery Approach.”

### Data-model tasks

- Add certification blueprint/version records with effective dates.
- Add controlled ECO domain and task/objective records per certification/version.
- Add controlled delivery-approach values.
- Add optional PMBOK performance-domain mapping.
- Add controlled topic/concept tags, difficulty, cognitive level, source/reference, content owner, last-reviewed date, and version where absent.
- Give each question one primary ECO domain and task/objective, one delivery approach, and optional secondary learning tags.
- Retain original imported source values for traceability during migration.
- Map existing free-text values to controlled records.
- Flag unmapped/ambiguous questions for admin review rather than guessing silently.

### Admin and import tasks

- Update question forms, bulk editing, CSV templates, import validation, export, and documentation.
- Prevent newline-separated task combinations and punctuation variants from becoming new domains.
- Prevent a question from contributing to readiness until required classifications are valid.
- Add content-coverage reporting by certification blueprint.

### Learner presentation

- Show official recognizable domain names, not internal codes.
- Display delivery approach separately from ECO domain.
- Keep PMBOK performance-domain analysis in a clearly labelled learning view.
- Provide direct practice actions from standardized weak domains/tasks.

### Acceptance criteria

- No analytics label conflates delivery approach with performance domain.
- All readiness-eligible questions use controlled, versioned classifications.
- Unmapped questions are visible to administrators and excluded from misleading readiness calculations.
- Counts do not fragment because of casing, punctuation, or combined free text.

## 12. Phase I — Actionable performance dashboard

Implementation will be staged so the dashboard does not imply accuracy before sufficient data exists.

### Stage 1: trustworthy current-data metrics

- Comparable exam-mode attempt count
- Recent weighted score using the last five comparable attempts
- First-seen accuracy
- Unique-question coverage
- Official blueprint coverage
- Domain accuracy with sample size and evidence status
- Score consistency across the last three to five comparable attempts
- Recurring incorrect questions/concepts
- Retention checks on previously missed concepts after a delay
- Unanswered-question rate
- Exam-date progress

### Stage 2: capture timing and behavior

- Store per-question first-view, first-answer, last-change, and final-answer timestamps.
- Record answer changes, flag/review actions, pause/resume periods, and section position.
- Distinguish active answer time from a background or suspended browser where feasible.
- Store first-seen versus repeated-question status at attempt time.
- Make telemetry proportionate, documented, and covered by the privacy notice.

### Stage 3: pacing and stamina

- Median seconds per question
- Target pace and projected completion
- Questions exceeding the configurable time threshold
- Final-rush and unanswered counts
- Accuracy and pace by quarter/official section
- Late-exam accuracy/speed change
- Effect of changing flagged answers

### Stage 4: transparent Practice Readiness Index

Proposed initial coaching formula:

`35% recent performance + 30% blueprint mastery + 15% consistency + 10% pacing + 10% coverage`

Rules:

- Do not display until the user has at least two comparable full-length simulations and sufficient domain coverage.
- Display “Not enough evidence yet” before qualification.
- Exclude training and preview attempts.
- Discount repeated-question performance.
- Show each component and explain every change.
- Call it PM Exam Pro practice guidance, never an official PMI score or guaranteed probability of passing.
- Keep bands configurable and recalibrate later using consenting learners' actual outcomes.

### Dashboard layout

1. Your Next Move
2. Practice Readiness and evidence quality
3. Weakest official ECO domains/tasks with Practice actions
4. Timing and stamina
5. Recurring mistakes and confident misconceptions
6. Coverage and retention
7. Exam-date study plan
8. Comparable recent attempts

### Acceptance criteria

- Every prominent metric leads to a specific learner action.
- Short, repeated, preview, or training activity cannot inflate readiness.
- Small samples display insufficient evidence rather than a confident rating.
- Calculations are documented, deterministic, and covered by fixture-based tests.

## 13. Phase J — Realistic simulation support

### Product tasks

- Support full-length, blueprint-balanced simulation definitions.
- Support exam sections and configured breaks where applicable.
- Give short practice sets proportional time limits and clearly label them as practice sets.
- Allow analytics to compare only equivalent attempt types.
- Add blueprint-coverage validation before publishing a full simulation.

### Content dependency

Application support can be implemented in this round, but realistic full simulations cannot be delivered without sufficient approved question inventory. Content owners must supply and validate enough current, correctly classified questions for each certification.

### Acceptance criteria

- The system distinguishes preview, short practice, training, and full simulation.
- Pacing/readiness calculations use full simulations only where the metric requires them.
- A full simulation cannot be published when its question count or blueprint distribution is invalid.

## 14. Phase K — Account, notification, accessibility, and general UX

### Account and communication

- Verify the user's account/privacy/receipt/logout fixes.
- Standardize referral discount/reward terminology.
- Add access-expiry reminders independent of payment-finalization changes.
- Provide an obvious support route from account, result, and error states.
- Display dates/times consistently with an explicit Malaysia timezone where appropriate.

### Accessibility

- Add the missing checkout voucher label without altering gateway behavior.
- Add a semantic login `h1`.
- Add appropriate `autocomplete` attributes to authentication/profile fields.
- Ensure validation, toast, autosave, timer, and training feedback are announced.
- Add text/table alternatives for charts.
- Support keyboard-only use, reduced motion, high contrast, and 200%/400% zoom.

### Navigation and operational polish

- Add a mobile menu for Catalog, FAQ, and Tutorial.
- Add the missing favicon and complete metadata/icon set.
- Avoid expected anonymous session probes producing noisy 401 console errors.
- Keep protected-route redirects and logout behavior intact.

### Acceptance criteria

- Key journeys satisfy the agreed WCAG 2.2 AA checks.
- Public mobile navigation exposes all primary destinations.
- Normal public browsing has no missing favicon or expected-auth console noise.
- Account and logout regression tests pass.

## 15. Phase L — Recommended UX and regression test programme

### Automated release gate

- Production build contains no development/UAT wording.
- Registration and password-change policy fixtures match.
- Optional onboarding can be skipped.
- Zero-question/draft publication and start guards work in UI and API.
- Preview, normal, training, save/resume, timeout, multiple-response, and review journeys pass.
- Product-specific attempts and domain calculations match known fixtures.
- Readiness weighting, first-seen accuracy, smoothing, coverage, consistency, pacing, and stamina match expected calculations.
- Repeated questions and insufficient samples cannot inflate readiness.
- One customer cannot access another customer's attempts, receipts, account, or orders.
- Desktop/mobile smoke coverage runs for supported browser engines.

### Accessibility tests

- Automated WCAG scan for every key template.
- Keyboard-only checkout, simulator, dialogs, dropdowns, review, charts, and account.
- VoiceOver/Safari and NVDA/Firefox or Chrome checks.
- Zoom, large text, text spacing, reduced motion, and forced-colors checks.

### Moderated usability plan

Prepare a facilitator script and observation sheet for five to eight target PMP/CAPM candidates per round. Tasks cover pack choice, free preview, registration, simulator controls, save/resume, weak-area interpretation, receipt/account/privacy, and logout.

Measure:

- completion rate
- first-click success
- time on task
- error and recovery rate
- abandonment point
- Single Ease Question score
- System Usability Scale score
- learner confidence before and after the simulator

Recruiting and running participant sessions require client coordination and are not assumed to be executable solely as a code change.

## 16. Traceability to the client journey/UX review

| Client recommendation | Planned phase | Result expected this round |
|---|---|---|
| Empty-exam guard | E | Implement and test |
| Accurate catalog/question claims | E | Implement and test |
| Correct product-specific analytics | G | Implement and test |
| Training Mode completion fix | F | Implement and test |
| Remove production UAT message | B | Implement and test |
| Consistent PM Exam Pro branding | C | Implement and test |
| Move demographics after registration | D | Implement and test |
| First-use simulator guide | F | Implement and test |
| Descriptive S/H controls | F | Implement and test |
| Compact mobile test bar | F | Implement and test |
| Clear preview timing | F | Implement and test |
| Standardized domain names | H | Implement foundation and migrate deterministically; flag ambiguous records |
| Separate correct/incorrect labels | G | Implement and test |
| Accessible confirmation dialog | F/K | Implement and test |
| Mobile public menu | K | Implement and test |
| One clear next action | I | Implement using trustworthy available data |
| Recent weighted performance | I | Implement and test |
| First-seen accuracy | I | Implement and test |
| Blueprint-weighted domain mastery | H/I | Implement after validated mapping; otherwise show insufficient evidence |
| ECO/delivery approach distinction | H | Implement and migrate |
| Timing and stamina metrics | I/J | Implement capture and eligible calculations |
| Consistency, coverage, retention | I | Implement and test |
| Practice Readiness Index | I | Implement behind evidence thresholds; no official-pass claim |
| Readiness-focused dashboard layout | I | Implement responsively |
| Full-length simulation mechanics | J | Implement platform support; content completion depends on approved inventory |
| Automated regression suite | L | Implement |
| Accessibility test programme | L | Automate where possible and document manual checks |
| Moderated usability research | L | Deliver plan/materials; execution requires participants |
| Payment assurance and gateway trust changes | Deferred | Not changed by instruction |

## 17. Proposed commit sequence

1. `Remove production UAT traces and unify authentication rules`
2. `Standardize PM Exam Pro customer-facing branding`
3. `Move optional demographics into learner onboarding`
4. `Guard empty exams and correct public content counts`
5. `Improve simulator completion, controls, mobile layout, and dialogs`
6. `Correct result scoring and product-specific analytics`
7. `Normalize ECO tasks and delivery-approach classifications`
8. `Capture learner timing and first-seen attempt evidence`
9. `Add actionable performance and readiness dashboard`
10. `Improve account accessibility, navigation, and notifications`
11. `Add end-to-end, calculation, accessibility, and production-build tests`
12. `Update audit status and operational documentation`

Commits may be adjusted when closely related schema and application changes must remain atomic.

## 18. Verification and deployment plan

### Local verification

- Database migration up/down or recovery verification
- API unit and integration tests
- Web and API type checking
- Production build
- Browser end-to-end tests at desktop and mobile sizes
- Keyboard/accessibility checks
- Repository and built-output brand/UAT scans
- Manual review of all changed email templates

### Pre-production safety

- Review schema and content mappings before applying them remotely.
- Produce a database backup before migrations.
- Report ambiguous ECO mappings for approval instead of silently changing them.
- Confirm no payment files or gateway settings changed.

### Production deployment

- Push reviewed commits to `origin/main`.
- Fast-forward the Exabytes checkout.
- Apply migrations with a recorded backup and rollback path.
- Build and restart only affected services.
- Verify homepage, health, registration, login, onboarding, catalog, simulator, results, dashboard, account, logout, and emails.
- Confirm administrator access and existing production content remain intact.
- Update both audit reports with Fixed, Partially Fixed, Deferred, or Requires Content status.

Production deployment will occur only after the implementation is approved and local verification passes.

## 19. Definition of done

This remediation round is complete when:

- All in-scope traceability rows are implemented or explicitly marked with an approved dependency.
- No production development/UAT trace remains.
- PM Exam Pro branding is consistent throughout customer-visible content and emails.
- Password rules match across registration and account changes.
- Demographics are optional post-registration onboarding.
- Zero-question exams cannot be published or started.
- Simulator concerns have regression coverage and no known dead end.
- Results and product-specific analytics use one consistent scoring implementation.
- ECO, task, delivery approach, and optional PMBOK mapping are correctly separated.
- Performance metrics are actionable, evidence-qualified, and do not imply an official PMI passing score.
- Accessibility and mobile acceptance checks pass.
- Payment code and behavior remain unchanged.
- Documentation, tests, commits, remote synchronization, and post-deployment smoke results are complete.
