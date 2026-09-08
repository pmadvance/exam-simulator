# PM Exam Pro — Client Update

**Date:** 8 September 2026  
**Release:** Second-round learner journey and analytics improvements

## Executive summary

The learner experience has been strengthened from first visit through practice and performance review. The main commercial improvement is a more credible Performance Dashboard: it now helps learners understand whether progress comes from broad, fresh practice or merely repeating familiar questions, and it tells them what to do next.

The dashboard is positioned as a coaching tool. It does not promise an official result, but it can now support exam preparation with transparent evidence across knowledge coverage, exam blueprint, delivery approach, pacing, stamina, consistency, and recurring mistakes.

## What learners gain

- A protected five-question preview that supports normal, true/false, and multiple-response questions.
- Clear distinction between quizzes, section practice, and full exam simulations.
- A readiness indicator that unlocks only after two different full simulations and sufficient fresh, classified content coverage.
- Fresh-question accuracy, so repeatedly memorising the same questions does not create false confidence.
- PMP/CAPM blueprint views that show both performance and how much evidence supports it.
- Delivery Approach insight across Predictive, Adaptive/Agile, Hybrid, and method-independent situations.
- Pacing guidance based on active time per question.
- Stamina comparison across the beginning, middle, and end of full simulations.
- Warnings about unanswered questions, excessive repeats, and recurring mistakes.
- Recommended next actions linked back to review and practice.
- Stable past results even when administrators later improve or retire questions.

## Other journey improvements

- Registration and password-change rules are consistent.
- Optional profile questions remain outside initial registration and onboarding can be skipped permanently.
- PM Exam Pro naming is consistent in pages and notification templates.
- Unsupported guarantees and inaccurate inventory claims were removed.
- Anonymous browsing no longer generates avoidable authentication errors.
- Preview wording and timers now clearly describe practice rather than a live exam attempt.
- Answer choices use improved keyboard and screen-reader semantics.
- Exams with no published questions cannot be started.

## Important content action

The system no longer guesses ambiguous question classifications. Existing questions without a valid ECO domain/task or Delivery Approach remain visible in the classification-coverage measure and prevent a high-confidence readiness score until the content is curated. New PMP/CAPM questions cannot be published without valid classification.

## Acceptance status

Local automated tests, production build checks, desktop browser checks, and 320 px mobile browser checks passed. The repeated production audit also passed across 26 clean-profile route and state checks. Payment testing was excluded by instruction. See `CLIENT-POST-REMEDIATION-VERIFICATION-2026-09-08.md` for the client-ready acceptance summary and remaining content actions.
