# PM Exam Pro — Second-Round Remediation Report

**Prepared:** 8 September 2026  
**Scope:** All findings in `SECOND-ROUND-FIX-VERIFICATION-AUDIT-2026-09-07.md`  
**Excluded:** Live payment execution, as requested

## Outcome

This release turns the learner dashboard from a score history into an evidence-based coaching dashboard. It also closes the preview, onboarding, branding, error-handling, content-integrity, timing, accessibility, and historical-data issues found in the second audit.

## Finding register

| Finding | Resolution |
|---|---|
| A-01 Multiple-response preview | Preview now receives question type and every populated option A–E. Multiple answers can be selected/deselected and are scored without regard to answer order. |
| A-02 Preview exposed the bank | The public payload contains a stable maximum of five questions and no answer or explanation. Grading is server-side, rate-limited, and reveals feedback only after submission. |
| A-03 Misleading coverage | Coverage denominator is every currently published question in the selected product, not only attempted exams. Blueprint coverage is separate. |
| A-04 Repeat/short/training inflation | Training attempts are excluded. Repeat answers do not improve first-seen accuracy. Readiness requires two different full simulations; recent score and consistency use full simulations only. |
| A-05 ECO fragmentation | PMP/CAPM task codes are mapped to official domain names and official weights. Sample sizes and evidence confidence are displayed. |
| A-06 Missing Delivery Approach | Controlled values are Predictive, Adaptive/Agile, Hybrid, and Agnostic. Admin create/edit/import/publish paths reject invalid classification for PMP/CAPM. Classification coverage is visible and gates readiness. Existing ambiguous values are not silently guessed. |
| A-07 Inconsistent readiness logic | One documented formula is used throughout: 30% recent full-simulation score, 30% smoothed first-seen accuracy, 20% blueprint mastery, 10% consistency, and 10% product coverage. Unlock requirements are visible. |
| A-08 Timing and test types | Tests have Quiz, Section Practice, or Full Simulation type. Legacy test type and obviously oversized 180-minute short-test settings are normalized. New attempts collect minimal per-question active-time telemetry for full-simulation pacing and stamina. |
| B-01 Legacy branding | Customer/admin emails, default support addresses, metadata, product descriptions, and production copy use PM Exam Pro. A deployment copy gate detects legacy/UAT wording. |
| B-02 Catalog claims | Product inventory/counts are dynamic and unsupported equivalence/pass guarantees were removed. |
| B-03 Onboarding skip | Complete and Skip both persist an onboarding completion timestamp. Existing learners who supplied profile data are migrated as complete. |
| B-04 Duplicate response errors | The API error handler checks whether headers were already sent and delegates safely; expected validation errors no longer create server-error noise. |
| B-05 Anonymous 401 noise | Navbar auth detection uses a 200 session-status endpoint; anonymous enrollment probes return `hasAccess: false`. |
| B-06 Preview framing | Anonymous users see Practice Simulator/Exam Preview framing and no misleading full-exam countdown before starting. |
| B-07 Answer accessibility | Single-choice answers expose radio semantics; multiple-response answers expose checkbox semantics and checked state. |

## Dashboard metrics and why they matter

- **Readiness score:** unlocked only after enough comparable, fresh, blueprint-balanced evidence. It is explicitly a coaching indicator, not an official PMI result or pass guarantee.
- **First-seen accuracy:** resists memorisation effects by counting only the first response to each question.
- **Smoothed first-seen accuracy:** avoids overconfidence from very small samples.
- **Product coverage:** shows how much of the live bank the learner has genuinely attempted.
- **Blueprint mastery and coverage:** weights PMP People/Process/Business Environment or the four CAPM domains according to the applicable official outline.
- **Delivery Approach:** shows whether judgment changes across Predictive, Adaptive/Agile, Hybrid, and approach-agnostic scenarios. This complements ECO, which measures the competency being tested.
- **Repeat share and recurring mistakes:** identify unproductive repetition and persistent misconceptions.
- **Unanswered rate:** identifies completion and time-management problems.
- **Consistency:** measures score variation across recent comparable full simulations.
- **Pacing:** compares observed active seconds per question with the configured allowance.
- **Stamina:** compares opening-, middle-, and final-third accuracy in full simulations.
- **Recommended next steps:** converts evidence into specific actions such as increase fresh coverage, review recurring mistakes, focus on a weak ECO domain, correct pacing, or complete a different simulation.

## Data integrity

Each new attempt stores an immutable question snapshot. Scoring, result review, and historical mastery use that snapshot, so later question edits or removals do not rewrite past results. Current-bank coverage still uses the current published catalog.

Question import/version rollback now preserves question type, option E, ECO, Delivery Approach, image, publication status, and difficulty. Invalid classified content cannot be published into PMP/CAPM readiness data.

## Reference standards

- PMP 2026 Examination Content Outline: People 33%, Process 41%, Business Environment 26%; 180 questions and 240 minutes.
- CAPM Examination Content Outline: Fundamentals/Core Concepts 36%, Predictive 17%, Agile 20%, Business Analysis 27%; 150 questions and 180 minutes.

Official references:

- https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf
- https://www.pmi.org/certifications/project-management-pmp/new-exam
- https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/capm-exam-content-outline-english.pdf
- https://www.pmi.org/certifications/certified-associate-capm

## Verification

- TypeScript typecheck: passed.
- Production build: passed.
- Production-copy gate: passed.
- API regression tests: 15/15 passed, including fixed readiness fixtures and historical snapshots.
- Database-backed local browser audit: desktop and 320 px mobile routes passed with no horizontal overflow, page errors, broken requests, or anonymous 401 responses in the final focused check.
- Multiple-response preview check: five options exposed with five checkbox semantics, clear multi-select instruction, server-side completion, and no answer data in the initial payload.
- Live payment test: intentionally excluded.
- Production browser audit: passed across 26 clean-profile desktop/mobile route and state checks. See `POST-REMEDIATION-VERIFICATION-AUDIT-2026-09-08.md`.
