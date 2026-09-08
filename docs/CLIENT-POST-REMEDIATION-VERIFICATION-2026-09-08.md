# PM Exam Pro — Client Verification Update

**Date:** 8 September 2026  
**Scope:** Learner journey, simulator, and Performance Dashboard improvements  
**Payment testing:** Deferred

## Overall outcome

The learner-facing fixes passed the repeated production audit on desktop and mobile. The public catalog, exam preview, registration form, access redirects, responsive layout, and image loading completed without browser errors.

The Performance Dashboard is now suitable to become a PM Exam Pro selling point. It has moved beyond showing scores and charts: it is designed to help a learner decide whether they are genuinely becoming exam-ready and what they should practise next.

## What makes the dashboard valuable

- It measures performance on **fresh questions**, reducing false confidence from memorising repeated questions.
- It separates **quizzes, section practice, and full simulations**, so short practice does not inflate readiness.
- It maps performance to the **PMP or CAPM exam blueprint** and shows whether enough evidence exists in each domain.
- It highlights **recurring mistakes**, unanswered questions, repeat-heavy practice, and weak domains.
- It measures **pacing and stamina** under full-simulation conditions.
- It compares judgment across **Predictive, Adaptive/Agile, Hybrid, and approach-agnostic** scenarios.
- It gives the learner **recommended next actions**, not just a result.
- It preserves historical results even when the question bank is improved later.

The readiness score has safeguards: it stays locked until there is enough fresh, balanced, classified evidence from at least two different full simulations. It is presented as a preparation/coaching indicator, not an official PMI score or a pass guarantee.

## Why ECO Domain and Delivery Approach are both important

The ECO view explains *which professional capability* is weak. The Delivery Approach view explains *which working environment* causes difficulty. For example, a learner may understand a Process topic but consistently choose the wrong action in an Agile or Hybrid scenario. Showing both turns a raw percentage into targeted study guidance.

## Production verification summary

- 26 clean-browser desktop/mobile checks completed.
- No HTTP failures, browser console errors, page errors, broken images, or horizontal overflow.
- The free preview supports multiple-response questions and option E.
- The initial preview payload does not expose correct answers or explanations.
- Signed-out learner pages redirect cleanly to registration/login and remember the intended destination.
- Registration asks only for full name, email, password, verification code, and acceptance of the Terms and Privacy Notice.
- Application, database, Redis, and production processes are healthy.
- Automated regression tests: 15/15 passed.

## Content work needed before a dashboard demonstration

The software is ready, but the current catalog cannot yet show a trustworthy unlocked readiness score:

- There are currently no full-length simulations; the existing seven tests are six quizzes and one section practice.
- Twenty-five of 197 published questions still need an editorial Delivery Approach classification.

This is an intentional quality safeguard. The platform will not manufacture a confident-looking statistic from short tests or incomplete content.

For the strongest client demonstration, complete those classifications, add at least two blueprint-balanced full simulations, and load a dedicated demo learner with realistic attempt patterns. That will allow the dashboard to demonstrate improvement, weak areas, pacing, stamina, consistency, and recommended next steps with credible data.

## Deferred items

ToyyibPay/payment testing remains deferred as requested. A final signed-in production journey should be repeated with a controlled QA learner and test enrollment once the demonstration content is ready.

## Follow-up simulator improvement

Multiple-response questions now tell the learner exactly how many answers to choose and prevent additional selections once that number is reached. The limit comes from the configured answer key, so questions requiring two and three answers behave correctly. Learners can deselect an answer and choose a replacement. The answer key itself remains private. The deployed two-answer flow and local three-answer flow both passed desktop and mobile browser verification.
