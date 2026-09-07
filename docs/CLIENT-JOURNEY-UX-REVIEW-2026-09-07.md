# PM Exam Pro Customer Journey & UX Readiness Review

**Prepared for client presentation**  
**Review date:** 7 September 2026  
**Environment reviewed:** Live PM Exam Pro website using the ToyyibPay sandbox

## Executive view

The PM Exam Pro customer journey is operational from discovery through paid exam access. A new visitor can explore the catalog, try a free preview, register, verify their email, pay through ToyyibPay, begin tests, save and resume work, review answers, see statistics, manage their account, download a receipt, and sign out.

Testing generated meaningful learner data across the full available catalog: **18 completed attempts and 516 question responses across six usable exams**. The simulator is responsive and contains a strong set of learning tools, including training feedback, explanations, multi-select questions, highlighting, strikethrough, marking for review, saved progress, and performance tracking.

Our recommendation is to complete a focused pre-launch improvement cycle before broad promotion. The main priorities are payment assurance, catalog accuracy, one unusable exam, and product-specific analytics.

## What works well

- Clear product positioning and strong calls to try a free exam.
- Five-question previews allow visitors to experience the simulator before purchasing.
- Email verification, registration, and login work.
- PMP and CAPM ToyyibPay sandbox purchases activate access immediately.
- The simulator works on desktop and mobile without horizontal layout problems.
- Learners can save an attempt and resume from the recorded answer count.
- Training mode gives immediate feedback and explanations.
- Single-choice and “select all that apply” questions work.
- Review screens show answered, unanswered, and flagged questions before submission.
- Results include detailed answer explanations and incorrect-answer filtering.
- Multiple attempts create useful trend, average, best-score, and history views.
- Account management, subscriptions, receipts, privacy requests, password recovery, and logout are present.

## Customer journey scorecard

| Journey stage | Status | Summary |
|---|---|---|
| Discover and compare packs | Good | Clear catalog and product pages; mobile navigation can improve. |
| Try before purchase | Good | Useful five-question simulator; preview timing needs clearer wording. |
| Register and verify | Good with fixes | Works, but optional profiling makes checkout longer and email branding differs from the website. |
| Understand final price | Needs improvement | Currency estimate is available, but the gateway fee appears only after redirect. |
| Pay and receive access | Good with fixes | Both sandbox payments activated access; gateway identity and receipt reconciliation need improvement. |
| Take and resume tests | Good | Core simulator is capable and mobile-friendly. |
| Learn through training | Good with one broken link | Feedback is useful; “Review answers” fails after training completion. |
| Understand performance | Needs improvement | Headline scores work; domain results mix PMP and CAPM data. |
| Manage account and exit | Good | Profile, subscriptions, receipts, privacy request, password reset, and logout work. |

## Priority actions

### Priority 1 — complete before broad launch

1. **Harden payment confirmation.** Confirm every ToyyibPay success directly with the gateway and match the order, bill, amount, currency, and transaction before granting access.
2. **Remove or repair the empty PMP exam.** One published test currently starts with zero questions and then shows an error.
3. **Align catalog promises with available content.** The site promotes 1,000+ questions, while 172 questions are currently published.
4. **Correct product-specific analytics.** Switching between PMP and CAPM must also filter ECO and performance-domain results.
5. **Fix the Training Mode completion link.** Do not offer “Review answers” if that training attempt is intentionally not retained.
6. **Remove the production UAT-code message.** Test-code guidance should never appear to live customers.

### Priority 2 — trust and conversion improvements

- Use the approved business name and support details on the ToyyibPay page instead of an individual merchant identity.
- Show the estimated MYR total and payment fee before redirecting customers.
- Make the application receipt reconcile the advertised USD price with the MYR amount and fee paid.
- Handle common plus-address emails gracefully and avoid leaving an account/order behind when the gateway rejects customer details.
- Align PM Exam Pro and PMAdvance branding in verification, reset, purchase, and receipt communications.
- Send a dedicated purchase confirmation and access-expiry reminders.
- Move optional age, occupation, and gender questions to post-purchase onboarding or account settings.

### Priority 3 — learner experience polish

- Add a short first-use guide for Training Mode, auto-forward, S/H tools, and flags.
- Replace or supplement “S” and “H” with descriptive, mobile-friendly controls.
- Use a compact sticky mobile test bar for question number, time, Save, and End.
- Make the preview promise explicit: “5-question preview · 1-minute demo,” separate from full-exam duration.
- Standardize domain names so performance insights are easy to understand.
- Show “correct” and “incorrect” as separately labelled numbers.
- Improve keyboard focus and Escape behavior in confirmation dialogs.
- Add a compact mobile menu for Catalog, FAQ, and Tutorial.

## Suggested experience direction

The product already has the mechanics of a strong exam-preparation platform. The next design step should move the learner experience from “test history” toward “guided readiness.”

A useful dashboard should answer four questions immediately:

1. What should I do next?
2. How close am I to being ready?
3. Which two areas need the most attention?
4. How much access time remains?

Recommended dashboard emphasis:

- Primary action: Resume the current attempt or start the recommended next test.
- Readiness summary: average, best, consistency, and progress against the correct exam threshold.
- Focus areas: two weakest standardized domains, with direct practice actions.
- Plan: actual exam countdown and a suggested pace based on remaining tests/access days.
- History: recent attempts, with detailed review one click away.

## Is the current performance dashboard useful?

**Yes for history, but only partly for improvement.** The present dashboard tells users how many tests they completed, their average and best score, recent results, and a basic trend. Detailed answer explanations are particularly valuable.

However, average and best score alone do not tell a candidate whether their knowledge is broad, stable, well-paced, or retained. A high score may come from a short test or memorized retake. The dashboard currently cannot identify late-exam fatigue, repeated misconceptions, unseen syllabus areas, or whether the user is answering quickly enough under realistic conditions.

PMI does not publish one universal percentage that PM Exam Pro can responsibly present as the official passing score. PMI says its passing standard is established through psychometric analysis and reports diagnostic performance by domain. PM Exam Pro should therefore use a clearly labelled **practice target/readiness indicator**, never a guaranteed pass prediction. Sources: [PMI Certification Handbook](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/generic-certification-handbook.pdf) and [sample PMI exam result report](https://www.pmi.org/-/media/pmi/microsites/update-center/exam-result-report.pdf).

## Performance features that help candidates improve

### 1. Give one clear next action

The first card should recommend the highest-value action based on evidence:

- Resume the current test.
- Review recurring mistakes.
- Practise the weakest official domain.
- Retest material that was previously missed after a suitable delay.
- Take a fresh full simulation when coverage and practice volume are sufficient.

### 2. Measure current ability, not lifetime history

Use a weighted average of the last five comparable exam-mode attempts, giving more weight to recent attempts. Keep short quizzes, full simulations, and training attempts separate.

### 3. Show first-seen accuracy

Report performance on questions the learner has not previously attempted. Keep retake improvement as a separate metric. This reduces false confidence caused by recognizing answers.

### 4. Align domain mastery to the official blueprint

Normalize all question tags and calculate results using the certification's current content weights. The July 2026 PMP blueprint is People 33%, Process 41%, and Business Environment 26%, with predictive and adaptive/agile/hybrid approaches represented throughout. CAPM currently weights Fundamentals/Core Concepts 36%, Predictive 17%, Agile 20%, and Business Analysis 27%. Sources: [2026 PMP Examination Content Outline](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf) and [PMI CAPM certification page](https://www.pmi.org/certifications/certified-associate-capm/).

Every domain should show accuracy, number of first-seen questions attempted, trend, and whether there is enough evidence. A domain based on only a few questions should display “insufficient evidence,” not a confident mastery label.

### 5. Add time-management and stamina metrics

Capture a timestamp for each answer and show:

- Median time per question and projected finish time.
- Unanswered questions and questions answered during a final rush.
- Questions where the candidate became stuck.
- Accuracy and speed by quarter/section of the exam.
- Whether performance declines late in a full simulation.

This requires realistic simulations. PMI currently describes PMP as 180 questions in four hours with two 10-minute breaks, and CAPM as 150 questions in 180 minutes. PM Exam Pro's current tests have 21–50 published questions but 180-minute limits, so they cannot yet provide meaningful full-exam pacing or stamina evidence. Sources: [PMI PMP certification page](https://www.pmi.org/certifications/project-management-pmp) and [PMI CAPM certification page](https://www.pmi.org/certifications/certified-associate-capm/).

### 6. Track consistency, coverage, and retention

- **Consistency:** average and score variation across the last three to five comparable full simulations.
- **Coverage:** unique questions and official blueprint areas attempted.
- **Retention:** accuracy when previously missed concepts return after several days.
- **Recurring errors:** concepts or questions missed at least twice.
- **Review effectiveness:** whether changing flagged answers usually helps or hurts.
- **Confidence calibration:** optionally identify confident-but-wrong answers, which are the most dangerous misconceptions.

### 7. Introduce a transparent Practice Readiness Index

An initial coaching formula could be:

`35% recent performance + 30% blueprint mastery + 15% consistency + 10% pacing + 10% coverage`

This should:

- Appear only after at least two comparable full simulations and adequate domain coverage.
- Say “Not enough evidence yet” beforehand.
- Exclude training mode and discount repeated questions.
- Show each component and explain why the result changed.
- Be labelled as PM Exam Pro practice guidance, not an official PMI score or probability of passing.
- Be recalibrated later using consenting learners' actual exam outcomes.

### Recommended dashboard layout

1. **Your next move** — one recommended action.
2. **Practice readiness** — transparent index and evidence quality.
3. **Weakest domains** — mastery, sample size, trend, and direct Practice buttons.
4. **Time and stamina** — pace, projected finish, and late-exam performance.
5. **Recurring mistakes** — high-priority review list.
6. **Coverage and retention** — unseen content and revision checks due.
7. **Exam plan** — days remaining and recommended weekly activity.
8. **Recent attempts** — comparable results with detailed review.

The key design rule is simple: **every prominent metric should tell the learner what to do next.**

## Recommended UX test plan

### Moderated usability sessions

Test with five to eight target candidates per round. Give each participant realistic tasks rather than instructions about where to click:

1. Choose the appropriate certification pack and describe what is included.
2. Try a free test and explain the difference between preview and full access.
3. Register and predict the amount they will pay before leaving the website.
4. Answer a “select all that apply” question and use highlight, strikethrough, and flagging.
5. Save midway, leave, return, and resume.
6. Use the results to identify what to study next.
7. Find a receipt, update account details, request privacy support, and sign out.

Measure task completion, first-click success, time, errors, abandonment points, confidence, and the System Usability Scale.

### Accessibility checks

- Keyboard-only completion of registration, payment return, simulator, review, and account flows.
- VoiceOver on Safari and NVDA on Firefox or Chrome.
- 200%/400% zoom, large text, high contrast, and reduced motion.
- Clear spoken announcements for timer warnings, autosave, validation, results, and training feedback.
- Text/table alternatives for charts.

### Functional regression suite

- Registration with common and edge-case email formats.
- Successful, failed, pending, abandoned, duplicate, delayed, and refunded payments.
- Payment amount/reference matching and duplicate-callback handling.
- Enrollment activation and exact expiry behavior.
- Zero-question/draft publication safeguards.
- Save/resume across refresh, browser close, network loss, and session renewal.
- Every question type, including images and true/false when those formats are introduced.
- Scoring and analytics against fixed expected answers, including multi-select answers chosen in different orders.
- Strict separation of PMP and CAPM statistics.
- Authorization checks so one customer cannot read another customer’s orders, receipts, or attempts.
- Chrome, Safari, Firefox, and Edge on desktop and mobile breakpoints.

## Proposed delivery sequence

### Immediate stabilization

- Payment verification and merchant identity
- Empty-exam guard
- Catalog/content-count correction
- UAT-message removal
- Training review and analytics filtering fixes

### Conversion and trust

- Shorter checkout
- Transparent total/fee display
- Branded verification, purchase, reset, and expiry emails
- Receipt reconciliation and clearer support route

### Guided learning

- Clean domain taxonomy
- Readiness-focused dashboard
- Recommended next action and weakest-area practice
- Mobile simulator compression and onboarding

### Ongoing assurance

- Automated end-to-end release tests
- Accessibility regression checks
- Quarterly moderated usability studies
- Payment and data-security review before enabling live transactions

## Launch readiness statement

PM Exam Pro’s core experience is working and demonstrates strong potential. After the immediate stabilization items are resolved and retested, the platform should be in a much stronger position for public acquisition: credible catalog promises, trustworthy payment, uninterrupted exam access, and analytics that clearly guide each learner’s next step.
