# PM Exam Pro Production End-to-End QA Audit

**Audit date:** 7 September 2026  
**Environment:** `https://www.pmexampro.com` with ToyyibPay sandbox  
**Perspective:** Anonymous visitor, new customer, paid learner, and UI/UX reviewer  
**Overall recommendation:** **Conditional no-go for a broad public launch.** The basic customer journey works, but payment callback security, one unusable published exam, content-volume claims, and several analytics/payment defects should be resolved first.

## 1. Executive summary

The production journey was exercised from the public catalog through free practice, registration, email verification, ToyyibPay sandbox payment, enrollment, simulator use, saved progress, repeated attempts, detailed results, performance analytics, account management, receipt access, password recovery, and logout.

Both PMP and CAPM sandbox purchases completed and immediately activated the correct subscriptions. Six usable exams were completed three times each, producing **18 submitted attempts and 516 graded question responses**. Normal exam mode, training mode, single-choice questions, multiple-response questions, marking for review, strikethrough, highlighting, save-and-resume, tab-switch warnings, result review, and statistics were all exercised.

The main journey is viable, but the following findings are launch-significant:

1. **Critical:** ToyyibPay callbacks are trusted without cryptographic authentication or a mandatory server-to-server transaction verification before enrollment is granted.
2. **High:** “Premier ATP PMP Practice Exam Q4 2024” is published with zero published questions and fails after the learner starts it.
3. **High:** Public copy promises a 1,000+ question bank, while production currently exposes only 172 published questions.
4. **High:** Valid Gmail plus-addresses are rejected by ToyyibPay after the application has already created an account and pending order.
5. **High:** Performance-domain analytics are not filtered when switching between PMP and CAPM.
6. **High:** Training mode offers “Review answers” after submission, but the destination says “Attempt not found.”

## 2. Scope and method

### Test identities

Two controlled student identities were used. Secrets and verification codes are intentionally excluded from this document.

- A Gmail plus-address was used to test realistic registration and verification. Registration succeeded, but ToyyibPay rejected the address and left a pending order.
- A clean Gmail address was used to complete both ToyyibPay sandbox purchases and all authenticated tests.

### Transactions and subscriptions

| Order | Product | Application price | ToyyibPay amount | Gateway fee | Result |
|---|---|---:|---:|---:|---|
| #2 | PMP practice pack | USD 0.52 | RM 2.10 | RM 1.00 | Paid; 5-day enrollment active |
| #3 | CAPM practice pack | USD 0.53 | RM 2.14 | RM 1.00 | Paid; 4-day enrollment active |

The gateway conversion and additional fee were observed on the ToyyibPay page. The application receipt records only the USD product price, not the MYR amount and gateway fee actually charged.

### Attempt volume

| Pack | Exam | Published questions | Submitted attempts | Responses generated |
|---|---|---:|---:|---:|
| PMP | Final PMP Practice Exam Q1 2023 | 21 | 3 | 63 |
| PMP | Final PMP Practice Questions Premier ATPs Q4 2022 | 26 | 3 | 78 |
| PMP | PMP Practice Exam Q4 2023 | 50 | 3 | 150 |
| PMP | Premier ATP PMP Practice Exam Q4 2024 | 0 | 0 | 0 |
| CAPM | CAPM Practice Items for Premier ATPs Q1 2024 | 25 | 3 | 75 |
| CAPM | CAPM Practice Exam Questions Q1 2025 | 25 | 3 | 75 |
| CAPM | CAPM Practice Items for Premier ATPs Q3 2024 | 25 | 3 | 75 |
| **Total usable content** | **Six exams** | **172** | **18** | **516** |

Additional non-persistent training-mode questions and five-question public previews were tested separately.

## 3. Journey results

### 3.1 Anonymous visitor and catalog

**Passed**

- Homepage, catalog, product details, FAQ, tutorial, terms, privacy, login, checkout, and exam pages loaded successfully.
- Catalog cards linked to the expected exam packs.
- Currency could be changed to MYR and persisted after reload.
- Mobile pages at 390 px did not overflow horizontally.
- Images inspected had alternative text, and primary links/buttons had accessible names.

**Observed concerns**

- The mobile public header hides Catalog, FAQ, and Tutorial without offering a menu. These routes remain reachable through other paths, but discovery is reduced.
- The homepage requests a missing `/favicon.ico`.
- Public pages make expected-but-noisy unauthenticated calls that return 401 for session/enrollment checks.
- Marketing states “1,000+ Question Bank,” but only 172 questions are published across the live catalog.

### 3.2 Free preview

Six of seven published exam URLs exposed a five-question free preview. The fourth PMP exam had no available preview because it has no published questions.

**Passed**

- Preview could start without registration.
- Answer selection, auto-forward preference, navigation, question highlighting, option highlighting, strikethrough, mark for review, review matrix, filters, confirmation, result, retry, and “Get Full Access” were exercised.
- Training mode displayed immediate Correct/Incorrect feedback, the correct answer, and the explanation.
- An exam-mode preview submitted successfully with a result of 1/5.

**Observed concerns**

- Preview metadata shows the full exam’s 180-minute duration while the running preview timer is only one minute. The mixed timing language can surprise users.
- “S” and “H” controls are compact but depend on hover/title knowledge; first-time users may not understand Strikethrough and Highlight.

### 3.3 Registration and verification

The checkout registration journey requested:

- Full name — required
- Email — required
- Password — required, minimum eight characters
- Verification code — required
- Acceptance of Terms of Use and Privacy Notice — required
- Age — optional, accepted range 13–120
- Occupation — optional, maximum 120 characters
- Gender — optional

Validation messages observed:

- “Please fill in all registration fields.”
- “Password must be at least 8 characters.”
- “Please enter the email verification code.”
- “Please agree to the Terms of Use and Privacy Notice.”

**Passed**

- Verification code delivery to the approved mailbox was confirmed by the recipient.
- A valid code created the student account and allowed the checkout to continue.
- Invalid login returned “Invalid email or password.”

**Observed concerns**

- Production checkout displays “or use code 111111 for UAT testing” even though production UAT bypass is disabled. This is confusing and should never appear in production.
- Registration enforces only eight characters, while password change also requires at least one letter and one number. The policy is inconsistent.
- Optional demographic fields are presented before payment, increasing checkout length and possible abandonment. Ask later unless these fields are operationally essential.

### 3.4 Email wording

#### Verification email

- **Subject:** “Your PMAdvance verification code”
- **Body meaning:** identifies itself as PMAdvance, provides the six-digit code, says it expires in 10 minutes, and advises the recipient to ignore it if they did not request it.

#### Password reset email

- **Subject:** “Reset your PMAdvance password”
- **Body meaning:** identifies itself as PMAdvance, includes a “Reset Password” button and fallback URL, says the link expires in 30 minutes, and advises the recipient to ignore an unrequested email.
- A production reset email request was successfully accepted for the controlled account. The password itself was not changed.

#### Purchase message

- ToyyibPay is configured with the short receipt message “Thank you for your purchase!”
- No separate PM Exam Pro purchase confirmation email was observed during the two sandbox purchases.

**Brand concern:** Customer-facing emails use PMAdvance while the product website uses PM Exam Pro. The relationship should be stated explicitly or the email templates should use PM Exam Pro with PM Advance as the legal/company footer.

### 3.5 Checkout and ToyyibPay

**Passed**

- Both PMP and CAPM products created orders.
- ToyyibPay sandbox loaded, accepted Maybank simulation, returned to PM Exam Pro, and activated access immediately.
- The success page named the purchased product, order, and USD application price.
- Paid orders appeared in account history, and printable receipt endpoints loaded.
- Repeated callback/finalization logic is idempotent at the payment-event layer.

**Observed concerns**

- A syntactically valid Gmail plus-address was rejected by ToyyibPay as an invalid `billEmail`. PM Exam Pro had already created the account and pending order, leaving an orphaned transaction.
- Because registration has no phone field, ToyyibPay receives `0000000000` as the payer phone.
- ToyyibPay displays the payment-account owner’s personal contact identity rather than a PM Exam Pro/PM Advance business identity. This should be corrected in the merchant profile before live payments.
- The additional RM 1.00 fee appears only on the gateway page. Show the likely gateway fee before redirect, or configure the merchant to absorb it.
- Stored payment references were `toyyibpay-undefined-[bill code]`; the callback payload used by this sandbox return did not supply the expected transaction field.
- The downloadable receipt says USD 0.52/0.53, while the customer paid a MYR-converted amount plus an RM fee. The receipt should reconcile product price, conversion, fees, and charged total.

### 3.6 Paid simulator

**Passed**

- Access control prevented unpaid tracked attempts and allowed attempts immediately after payment.
- All six usable tests loaded their expected published question counts.
- Single-choice and multiple-response selection worked.
- Multiple-response UI showed “Select all that apply,” accepted multiple selections, returned the correct-answer set, and locked options after training feedback.
- Auto-forward on/off, Previous/Next, mark for review, review grid, filters, question/option highlighting, strikethrough, fullscreen control, and final confirmation were exercised.
- Save and Exit persisted progress; a mobile attempt resumed with 1/25 answered and the correct remaining time.
- Switching to another browser tab incremented “Tab switches” from zero to one.
- Submission with unanswered questions displayed the correct warning count.
- Detailed result review displayed choices, selected/correct states, explanations, incorrect-only filter, and share action.
- The 390 px mobile simulator had no horizontal overflow and kept all controls reachable.

**Observed concerns**

- “Premier ATP PMP Practice Exam Q4 2024” advertises 0 questions, still permits Start Exam, then displays “Error Loading Questions — No questions available for this exam.” It also leaves a zero-question in-progress attempt.
- Training-mode attempts are deliberately deleted at submission, but the result page still shows “Review answers.” That link resolves to “Attempt not found.”
- On mobile, the long exam title and control stack push the first question well below the top. A compact sticky exam toolbar would reduce vertical cost.
- The submission dialog receives no focus when opened, does not trap keyboard focus, and does not close with Escape.
- The exam page’s public header remains visible during the simulator. A more focused exam shell could reduce distraction and reclaim vertical space.

### 3.7 Results and analytics

For the selected CAPM pack, the dashboard correctly displayed nine completed tests, a 21% average, a 32% best score, recent results, active subscriptions, and the latest result. Switching to PMP displayed its nine submitted attempts and its own headline summary.

**Passed**

- Results listed raw and percentage scores.
- Detailed review calculated pass/fail using the exam’s 70% threshold.
- Trend data appeared after multiple attempts.
- Exam-date goal saved and displayed a day countdown.
- Product switching changed attempts, average, best, and history to the selected pack.

**Observed concerns**

- Project Performance Domain and ECO Domain tables do not filter by selected pack. PMP and CAPM showed the same combined totals (516 responses).
- Source review found dashboard badge/latest-score logic using a fixed 65% threshold, while current exams and detailed results use 70%. A score from 65–69% could be shown inconsistently as pass and fail.
- Performance aggregation compares multiple-response answers as raw strings, while submission scoring compares answer sets. Selecting all correct choices in a different order can score correctly on submission but incorrectly in domain analytics.
- ECO domain data is highly fragmented and inconsistent: examples include codes, descriptive phrases, combined multi-line values, punctuation variants, and “Uncategorized.” This makes the table difficult to interpret and weakens coaching value.
- The “Overall” tab primarily repeats a trend chart, while a separate “Trends” tab exists. Tab intent should be clarified.
- Detailed result copy such as “3 / 18 Correct / Incorrect” is visually ambiguous. Use separate labels: “3 correct” and “18 incorrect.”

### 3.8 Account, privacy, receipts, and logout

**Passed**

- Profile fields loaded and a profile save returned success.
- Client-side password validation detects missing letter/number and confirmation mismatch; server logic also requires the current password for a change.
- Both active subscriptions and both paid orders appeared.
- Receipt JSON/printable receipt access worked for the authenticated owner.
- A controlled PDPA access request was submitted and acknowledged.
- Referral link/code and zero-state metrics appeared.
- Logout cleared the session and returned to the homepage.
- A direct visit to `/me/dashboard` after logout redirected to `/login?next=%2Fme%2Fdashboard`.
- Remember Me issued Secure, HttpOnly, SameSite=Lax access and refresh cookies; the refresh session was configured for 14 days.

**Observed concerns**

- Checkout voucher entry was the only inspected input without an accessible label.
- Login uses a visual heading but no semantic `h1`.
- Password inputs generated browser guidance that autocomplete attributes should be supplied.
- Account referral copy says both parties get “15% off,” while the account metric says “Rewards Earned USD.” Confirm the business rule and terminology are consistent across voucher and cash/reward concepts.

## 4. Prioritized defect and improvement register

| ID | Priority | Area | Finding | Recommended action |
|---|---|---|---|---|
| SEC-01 | Critical | Payments | ToyyibPay callback status is accepted without authenticated signature validation or mandatory provider verification before enrollment. | On every success callback, retrieve the transaction server-to-server and verify bill code, external order ID, amount, currency, successful status, and provider transaction ID before finalizing. Add replay, mismatch, and forged-callback tests. |
| CONTENT-01 | High | Catalog | Published PMP Q4 2024 exam has zero published questions and fails after Start. | Unpublish the exam until at least one validated question set is published; prevent publishing/starting zero-question exams. |
| CONTENT-02 | High | Marketing | 1,000+ question claim conflicts with 172 published questions. | Publish the promised inventory or change all public claims to the exact available count. |
| PAY-01 | High | Checkout | Plus-address rejection occurs after user/order creation. | Validate provider compatibility before creating durable records, normalize or safely encode supported email formats, and roll back/expire failed checkout records. |
| ANALYTICS-01 | High | Stats | Domain tables ignore the selected product. | Filter aggregation by selected product/exam IDs on the server or recompute from filtered attempts on the client. |
| SIM-01 | High | Training | Review link is broken after training submission. | Keep a non-scored review snapshot, or hide the review link and return directly to the exam list. |
| PAY-02 | High | Payments | Transaction reference includes `undefined`. | Support actual ToyyibPay callback field names and fall back to a verified provider transaction identifier. |
| PAY-03 | High | Trust/privacy | Gateway page exposes personal merchant identity. | Change the ToyyibPay merchant profile to the approved company/support identity. |
| PROD-01 | High | Production config | UAT code helper is visible in production. | Render it only when public runtime configuration confirms UAT mode. |
| ANALYTICS-02 | Medium | Stats | Dashboard uses 65%; exam/results use 70%. | Use each exam’s configured pass threshold everywhere. |
| ANALYTICS-03 | Medium | Stats | Multiple-response domain scoring is order-sensitive. | Parse both values into normalized sets before comparison. |
| DATA-01 | Medium | Content data | ECO taxonomy is inconsistent, and delivery approaches are mislabeled as performance domains. | Map imports to controlled ECO domain/task, delivery-approach, and optional PMBOK performance-domain records; validate all published questions. |
| PAY-04 | Medium | Checkout | Fee and charged MYR total are not represented by the application receipt. | Show fee before redirect and issue a receipt that reconciles displayed price with charged amount. |
| BRAND-01 | Medium | Email | PMAdvance email branding differs from PM Exam Pro. | Use one customer-facing product identity and include the legal company name in the footer. |
| A11Y-01 | Medium | Accessibility | Submission dialog lacks initial focus, focus trap, and Escape close. | Implement accessible modal focus management and restore focus on close. |
| UX-01 | Medium | Checkout | Optional demographics extend the payment form. | Move optional profiling to onboarding/account after purchase. |
| UX-02 | Medium | Preview | One-minute timer conflicts with 180-minute metadata. | Label “5-question preview · 1-minute demo” separately from full-test duration. |
| NAV-01 | Medium | Mobile | Public mobile header has no route menu. | Add a compact menu for Catalog, FAQ, and Tutorial. |
| A11Y-02 | Low | Semantics | Voucher lacks label; login lacks `h1`; password autocomplete hints are absent. | Add label/id, semantic heading, and correct autocomplete attributes. |
| OPS-01 | Low | Assets/logging | Missing favicon and routine anonymous 401 console noise. | Add favicon and avoid or silence expected unauthenticated fetch failures. |

## 5. Recommended UI/UX changes

### Is the current performance dashboard useful?

**Partly.** It is useful for recalling what the learner completed: attempt count, average score, best score, recent history, detailed answer review, and a basic trend. These features can motivate continued practice and make prior mistakes retrievable.

It is not yet strong enough to answer the learner's most important question: **“What should I do next to improve my actual-exam readiness?”** Current averages treat every attempt similarly, even when tests differ in length; best score can reward a one-off result or memorized retake; the dashboard does not measure timing, stamina, first-seen performance, coverage, or repeated weaknesses; and the domain data is currently mixed between products and inconsistently tagged.

It should also avoid calling a learner “ready to pass” from a fixed raw percentage. PMI states that certification passing standards are determined through psychometric analysis, and the official result is criteria-based rather than a publicly stated universal percentage. PM Exam Pro may use a clearly labelled **practice target**, but it must not imply that 65% or 70% is PMI's official passing score. See the [PMI Certification Handbook](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/generic-certification-handbook.pdf) and [sample PMI exam result report](https://www.pmi.org/-/media/pmi/microsites/update-center/exam-result-report.pdf).

### Build an actionable learner dashboard

The revised dashboard should have four levels, in this order:

1. **Next best action:** resume an attempt, review recurring errors, practise a weak domain, or take a full simulation.
2. **Practice readiness:** a transparent, evidence-based band with the factors that increased or reduced it.
3. **Performance diagnosis:** knowledge, pacing, consistency, coverage, confidence, and stamina.
4. **Evidence:** attempt history and question-level review.

#### Recommended metrics and calculations

| Metric | Suggested calculation | Why it helps the learner |
|---|---|---|
| Recent weighted score | Weighted mean of the last five comparable exam-mode attempts, with weights `1, 2, 3, 4, 5` from oldest to newest | Reflects current ability more than old results. Compare like-for-like tests and exclude training mode. |
| First-seen accuracy | Correct first responses on questions never previously seen ÷ first-seen questions | Reduces the false confidence caused by memorizing repeated questions. |
| Blueprint-weighted mastery | Sum of each normalized domain's accuracy × official domain weight | Aligns study attention with what the certification actually tests. Use smoothed estimates until a domain has enough responses. |
| Domain mastery confidence | Show domain accuracy with sample size and a confidence band; mark fewer than 15 first-seen items as “insufficient evidence” | Prevents a domain based on two lucky questions from looking mastered. |
| Consistency | Mean and standard deviation of the last three to five comparable full simulations | A stable 75% is more reassuring than alternating between 55% and 90%. |
| Coverage | Unique published questions attempted ÷ total published questions, plus blueprint coverage by domain/task | Shows whether the learner's result represents the syllabus or a narrow subset. |
| Retention | Accuracy on previously incorrect questions after at least 3–7 days | Measures learning that persists, rather than immediate answer recall. |
| Repeated-error rate | Questions or concepts answered incorrectly at least twice ÷ questions repeated | Produces a high-value revision list. |
| Pacing | Median seconds per answered question, projected finish time, unanswered count, and percentage answered within target pace | Identifies time-management risk before exam day. Requires per-question timestamps. |
| Stamina | Accuracy and median response time by exam quarter or official section | Reveals late-exam fatigue or rushing that an overall percentage hides. |
| Review efficiency | Accuracy before versus after changing an answer; time spent on flagged questions | Helps determine whether review behavior improves or damages results. |
| Confidence calibration | Optional confidence selection compared with actual correctness | Separates confident misconceptions from low-confidence knowledge gaps. Keep the control optional to avoid slowing every question. |
| Practice quality | Full simulation completion, unanswered rate, excessive pauses, and repeated-question share | Distinguishes strong evidence from a short or heavily repeated attempt. |

For small domain samples, use a transparent smoothed rate rather than raw accuracy. One simple option is:

`smoothed mastery = (correct first-seen answers + 5) / (first-seen answers + 10)`

This starts an untested domain at a neutral 50% prior and allows real evidence to dominate as the sample grows. The prior and minimum sample threshold should be validated with subject-matter experts and real learner data.

#### Proposed Practice Readiness Index

Until the platform has enough actual-exam outcome data to calibrate a predictive model, use a **Practice Readiness Index**, not a “probability of passing.” A practical version is:

`Readiness = 35% recent weighted score + 30% blueprint-weighted mastery + 15% consistency + 10% pacing + 10% coverage`

Rules:

- Calculate it only after at least two comparable full-length simulations and adequate domain coverage.
- Display “Not enough evidence yet” before that threshold.
- Show the component scores and the exact reason for every recommendation.
- Exclude training mode and strongly discount repeated-question performance.
- Treat any readiness bands as PM Exam Pro coaching bands, not PMI result categories.
- Calibrate weights and bands later by comparing consenting learners' practice data with their actual pass/fail and domain outcomes.

#### Align simulations and analytics to current exam blueprints

As of this review, PMI describes the current PMP exam as 180 questions in four hours with two 10-minute breaks. The July 2026 PMP outline weights People 33%, Process 41%, and Business Environment 26%; approximately 40% of items use predictive approaches and 60% are split between adaptive/agile and hybrid approaches. Sources: [PMI PMP certification page](https://www.pmi.org/certifications/project-management-pmp) and [2026 PMP Examination Content Outline](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf).

PMI describes CAPM as 150 questions in 180 minutes, including 15 unscored pretest questions. Its published content weighting is Fundamentals/Core Concepts 36%, Predictive 17%, Agile 20%, and Business Analysis 27%. Source: [PMI CAPM certification page](https://www.pmi.org/certifications/certified-associate-capm/).

The current PM Exam Pro tests contain 21–50 published questions but display 180-minute limits. This makes pacing, stamina, and exam-condition claims weak. Add at least one blueprint-balanced full-length simulation per certification, official-style sections/breaks where applicable, and short practice sets whose shorter time limits are proportional and clearly labelled.

#### Why ECO and performance classification is essential

Domain tagging is not merely an administrative field. It is the foundation for three of the platform's most valuable promises:

1. **Exam representativeness:** a simulation can be assembled in approximately the same proportions as the current certification blueprint.
2. **Useful diagnosis:** a learner can see the capability or syllabus area causing lost marks, rather than receiving only an overall percentage.
3. **Targeted improvement:** the system can recommend the next practice set, explanation, or revision topic with the highest expected benefit.

It also gives administrators a measurable content-quality view: missing blueprint areas, overrepresented topics, stale questions, weak distractors, and domains where the bank is too small to support a reliable conclusion.

The classifications must not be conflated:

| Classification | Meaning | Recommended use |
|---|---|---|
| Exam Content Outline (ECO) domain | What the certification exam tests. For current PMP: People, Process, and Business Environment. CAPM uses its own four content areas. | Primary readiness, blueprint coverage, exam assembly, and learner diagnosis. |
| ECO task/enabler or learning objective | The more specific capability beneath an ECO domain. | Precise weak-skill diagnosis and targeted practice. |
| Delivery approach | The context or way of working: predictive, adaptive/agile, hybrid, or approach-agnostic. | Cross-cutting balance and comparison within ECO domains. It is not a “performance domain.” |
| PMBOK performance domain | A broad area of project-management practice defined by the PMBOK Guide. The current Eighth Edition uses seven: governance, scope, schedule, finance, stakeholders, resources, and risk. | Optional secondary learning map and curriculum navigation; do not substitute it for the certification ECO. |

PMI explicitly states that predictive, adaptive/agile, and hybrid approaches appear throughout the PMP ECO domains. Therefore, “Agile,” “Hybrid,” “Predictive,” and “Agnostic” should be stored and displayed as **delivery approaches**, not “Project Performance Domains.” The official [2026 PMP Examination Content Outline](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf) supports that cross-cutting model. The [PMBOK Guide overview](https://www.pmi.org/standards/pmbok) separately describes the current performance-domain structure.

The current database values make this distinction especially important. The application calls Agile, Hybrid, Predictive, and Agnostic “performance domains,” while the ECO field contains a mixture of numeric codes, task descriptions, multiple newline-separated tasks, and punctuation variants. Aggregating those raw values produces dozens of fragmented rows rather than a clear readiness diagnosis.

#### Recommended question-classification model

Every published question should have these controlled fields:

- Certification and blueprint version, including effective date
- One primary ECO domain
- One primary ECO task/learning objective and optional enabler
- One delivery approach: predictive, adaptive/agile, hybrid, or agnostic
- Optional PMBOK performance domain for curriculum navigation
- One or more controlled topic/concept tags
- Difficulty and cognitive level
- Question type and source/reference
- Content version, review owner, last validation date, and publication status

Use identifiers and foreign keys behind the labels, not imported free text. When a question legitimately spans several tasks, retain one **primary scored classification** and optional secondary tags. This prevents one response from being counted multiple times or appearing as a new combined domain.

#### How domain information should appear to learners

- Show official, recognizable names rather than internal codes.
- Display accuracy, first-seen sample size, recent trend, coverage, and evidence quality together.
- Compare the learner's practice distribution with the official exam weighting: for example, “Business Environment is 26% of the current PMP blueprint; you have covered only 8 first-seen questions.”
- Mark small samples as “Not enough evidence” instead of ranking them as strong or weak.
- Lead with two or three priority gaps, not a table containing dozens of rows.
- Give each gap a direct action such as “Practise 15 fresh Process questions.”
- Allow a second view by delivery approach so a learner can detect, for example, strong predictive performance but weak adaptive/hybrid judgment across several ECO domains.
- Keep PMBOK performance-domain analysis in a clearly labelled learning view rather than presenting it as the official exam blueprint.

Without accurate ECO and approach tagging, the proposed Practice Readiness Index should not be launched: the domain component would give precise-looking but unreliable advice.

#### Recommended learner-facing cards

- **Your next move:** “Review 8 recurring errors in Process” or “Take a fresh full simulation.”
- **Practice readiness:** score/band plus “based on 3 full simulations, 82% blueprint coverage, stable pacing.”
- **Domain map:** normalized official domains with mastery, first-seen sample size, trend, and a Practice button.
- **Time management:** target pace, actual pace, projected completion, slowest domain, and late-section accuracy drop.
- **Knowledge gaps:** top recurring concepts and confidently wrong questions.
- **Progress quality:** unique-question coverage, repeat share, retention checks due, and consistency.
- **Exam plan:** days remaining, recommended weekly questions/full simulations, and whether the learner is on pace.
- **Recent evidence:** comparable attempts with score, duration, first-seen accuracy, unanswered count, and review link.

The design should explain every number in plain language. A metric without an associated learner action should not occupy prime dashboard space.

### Before broader customer acquisition

1. Remove the broken zero-question exam and reconcile every question-count claim.
2. Simplify checkout: email, name, password, verification, consent, and payment first; collect demographics later.
3. Show a complete price summary before redirect: USD base, estimated MYR conversion, gateway fee, and final expected charge.
4. Replace personal gateway identity with company branding and support contact details.
5. Fix product-specific analytics and normalize the domain taxonomy so the stats become actionable rather than merely decorative.
6. Resolve training-mode completion: either preserve review or offer “Continue training” and “Back to My Exams,” without a dead link.
7. Add an exam-readiness guard: no public exam can start unless it has at least one published question and valid timing/threshold metadata.

### Experience polish

- Add a brief first-run simulator tour for S/H tools, mark for review, training mode, and auto-forward.
- Use descriptive control labels or tooltips that are also visible/tappable on mobile.
- Collapse the mobile simulator header into a sticky bar containing question number, timer, and Save/End actions.
- State what happens when the learner leaves, loses connectivity, or time expires.
- Separate “Overall summary” from “Score trend” and make each analytics tab answer a clear learner question.
- Surface the weakest two or three standardized domains with a direct “Practice this area” action.
- Add purchase confirmation email, access-expiry reminders, and a clear support path.
- Display order timestamps and exam timestamps consistently in Malaysia time with an explicit timezone.

## 6. Recommended future test programme

### Automated release gate

Run on every release against staging with deterministic fixtures:

- Anonymous catalog → preview → signup → email verification → checkout → sandbox callback → enrollment.
- Payment callback authentication, replay, wrong order, wrong bill code, wrong amount, wrong currency, and failed/pending status.
- Email formats including plus-addresses, long addresses, international domains, and case normalization.
- Zero-question and draft-question publication guards.
- Save/resume after refresh, browser close, token refresh, and temporary network loss.
- Timer expiry using server time, background-tab behavior, and simultaneous sessions.
- Single-choice, multiple-response in different selection orders, true/false, image questions, and explanations.
- Training submission and its permitted post-submit routes.
- Pack-specific dashboard, trends, ECO, and performance-domain calculations using known expected scores.
- Readiness calculations using fixed fixtures for recent weighting, first-seen accuracy, smoothing, coverage, consistency, pacing, and stamina.
- Protection against inflated readiness from repeated questions, training attempts, short tests, and inadequate sample sizes.
- Authorization tests for receipts, attempts, orders, profiles, and admin routes using another user’s IDs.
- Desktop and mobile smoke tests for Chrome, Safari, Firefox, and Edge.

### Accessibility testing

- Automated WCAG 2.2 AA scan on every key template.
- Full keyboard-only journey, including dialogs, simulator controls, dropdowns, review matrix, and charts.
- Screen-reader sessions with VoiceOver/Safari and NVDA/Firefox or Chrome.
- 200% and 400% zoom, text spacing overrides, reduced motion, and high-contrast/forced-colors.
- Accessible chart alternatives and correctly announced autosave, timer, validation, toast, and training feedback states.

### Usability research

Recruit five to eight PMP/CAPM candidates per round and ask them to:

1. Find the right pack and explain what is included.
2. Start and finish a free preview without assistance.
3. Register and predict the final amount before leaving for payment.
4. Complete a multiple-response question and explain S, H, flagging, training, and auto-forward.
5. Save an attempt, return later, and resume it.
6. Find their weakest knowledge area and decide what to study next.
7. Download proof of purchase, change their profile, request privacy assistance, and sign out.

Capture completion rate, time on task, first-click success, error recovery, checkout abandonment, System Usability Scale score, Single Ease Question scores, and qualitative confidence before/after using the simulator.

### Operational and lifecycle tests

- Enrollment expiry at the exact boundary and clear renewal behavior.
- Failed, abandoned, duplicate, delayed, and refunded payments.
- Email deliverability across Gmail, Outlook, Yahoo, corporate domains, and spam filtering.
- Currency-rate failure/fallback and rounding.
- Large question banks and concurrent test starts under realistic production load.
- Backup/restore of users, purchases, attempts, and result history.
- Admin correction workflows for payment, enrollment, content, and support cases.

## 7. Exit criteria for launch readiness

The platform should be considered ready for broad public traffic when:

- SEC-01 is remediated and independently verified.
- No published exam has zero questions or draft-only inventory.
- Catalog and marketing counts match the production database.
- The plus-address/orphan-order problem is fixed or clearly handled.
- Payment totals and receipts reconcile with the actual customer charge.
- PMP/CAPM analytics are isolated correctly and use one pass threshold.
- Training completion has no dead-end link.
- A keyboard and screen-reader pass covers checkout and simulator dialogs.
- A repeat of this smoke journey passes in staging and production sandbox.

## 8. Verification and test-data cleanup

Repository verification completed after the documentation was prepared:

- API tests: **9 passed, 0 failed**
- Monorepo TypeScript checks: **3 packages passed**
- Production homepage: HTTP 200
- Production `/health`: HTTP 200 with database and required Redis connectivity ready

The audit used controlled production student records, sandbox payment transactions, attempts, sessions, verification/reset tokens, one exam goal, and one PDPA test request. After evidence capture, the two exact student identities and their dependent test records were deleted in one database transaction:

- 2 student users
- 3 sandbox orders and 2 payment events
- 2 enrollments
- 20 attempts
- 34 authentication sessions
- 49 audit records generated by those users
- 2 referral codes
- 2 verification-code records
- 1 password-reset token
- 1 PDPA request
- 1 exam goal

Post-cleanup verification found zero matching test users, orders, attempts, or enrollments. The four administrator accounts, two products, seven exams, 197 total question rows, 32 application settings, catalog content, gateway configuration, and infrastructure remained intact.
