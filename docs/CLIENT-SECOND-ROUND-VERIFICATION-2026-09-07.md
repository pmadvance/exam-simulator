# PM Exam Pro — Client Second-Round Verification Summary

**Date:** 7 September 2026  
**Scope:** Production learner journey and improvement verification; payment excluded  
**Status:** **Major progress confirmed; focused remediation is still required before the analytics can be presented as a dependable readiness indicator.**

## What is working better

- Production is online and healthy, including the database and Redis.
- The public catalog, product detail, free preview, registration, help, tutorial, privacy, and terms pages work on desktop and a 320-pixel mobile screen.
- The full five-question free preview can be started, answered, reviewed, submitted, and scored.
- Registration is simpler: demographic questions are no longer required.
- Password guidance is consistent and the old UAT/test codes are rejected in production.
- Learner-only dashboard and performance pages redirect anonymous visitors to sign in.
- Empty exams are prevented from showing a start control in the implemented code.
- No horizontal overflow or broken images were detected on the audited public routes.

## Is the Performance dashboard more meaningful?

**Yes.** It now gives a learner more than a list of scores. It separates products, respects the practice test threshold, highlights recent performance, first-seen accuracy, coverage, consistency, unanswered questions, recurring mistakes, ECO knowledge areas, and Delivery Approach. It also correctly says that its guidance is not a guaranteed PMI result.

**However, the overall readiness number should not yet be treated as dependable.** A learner can repeat one short test and appear to have high coverage because the current calculation compares them only with exams they have already attempted, not with the full selected product. The production ECO data also contains many task codes rather than clean domain names, so the domain advice looks more precise than the underlying data supports.

Recommended interim presentation: retain the useful component metrics, call the section **Practice Progress** or **Readiness Evidence**, and keep the single readiness score hidden until the calculation and content mapping are corrected.

## Why ECO Domain and Delivery Approach both matter

- **ECO Domain** describes what the certification tests—for example People, Process, or Business Environment in the relevant PMP blueprint.
- **Delivery Approach** describes the context in which that knowledge is applied—Predictive, Agile/Adaptive, Hybrid, or Agnostic.

Keeping them separate produces better coaching. A learner may understand Process concepts overall but perform poorly when the scenario uses a hybrid delivery approach. Combining the two would hide that pattern.

For useful advice, both classifications must be controlled and complete. The current 197-question bank has fragmented ECO task codes and 25 PMP questions without a Delivery Approach, so content mapping is the next prerequisite.

## Important issues found in round two

1. **Free-preview multiple-response questions are broken.** The preview allows one answer and omits option E, but 39 live questions require multiple answers and all 39 use option E.
2. **Preview content can be collected by repeated reloading.** Each request returns different random questions together with correct answers and explanations.
3. **Readiness coverage is misleading.** Completing one 21-question PMP test can display 100% coverage even though the product currently has 122 questions.
4. **Repeated short tests and training feedback can inflate readiness.** Two attempts need not be different or full length, while training answers currently feed the readiness domain component.
5. **ECO data needs normalization.** The system currently groups many task/subtask codes as though each were a domain.
6. **Legacy branding remains.** Both live product descriptions still mention “PM Advance,” and an administrator welcome-email template still uses “PMP Practice Exam Simulator.”
7. **Optional onboarding skip is not permanent.** A learner who declines demographics can be sent back after every login.
8. **Marketing and inventory are not fully aligned.** The PMP copy claims 1,000 questions while 122 are currently published; the homepage mentions four certifications while two packs are available.
9. **Fresh API errors appeared during the audit.** The server logged double-response errors that need tracing even though the audited pages remained available.
10. **Preview framing is confusing.** It says “Exam In Progress” and shows a three-hour clock before starting a one-minute free preview.

## Recommended order of work

1. Repair multiple-response previews and protect the paid question bank.
2. Correct readiness coverage/eligibility and temporarily hide or rename the composite score.
3. Approve a versioned ECO and Delivery Approach taxonomy, then map all published questions.
4. Remove remaining legacy branding from database content and emails.
5. Make onboarding skip permanent.
6. Trace and fix the production double-response error.
7. Align exam type/timing and public claims with the current inventory.
8. Add a controlled QA learner so full authenticated attempt, results, and dashboard regression tests can run after every release.

## Suggested client acceptance tests

- Ask a new learner to register without guidance and explain any confusing wording.
- Observe a first-time user completing the free preview on phone and desktop.
- Test one single-choice and one multiple-response question with keyboard only.
- Give learners fabricated dashboards representing a beginner, an improving user, a repeated-question user, and an exam-ready user; ask what they would study next.
- Ask learners to explain ECO Domain versus Delivery Approach in their own words.
- Verify that each recommendation links to an immediate action.
- Test poor connectivity, refresh/resume, timer expiry, and logout/login recovery.
- Run a moderated screen-reader session and zoom testing at 200%.

## Audit limitation

Payment was intentionally skipped. A new live authenticated journey was also not created because the post-reset QA accounts no longer exist, and production registration requires a real email verification code. The public journey was exercised live; authenticated learner behavior and analytics calculations were reviewed from the deployed code and production aggregate data. A controlled QA learner should be created for the next acceptance run and removed afterward.

Full technical details are in `docs/SECOND-ROUND-FIX-VERIFICATION-AUDIT-2026-09-07.md`.
