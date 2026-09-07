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
| DATA-01 | Medium | Content data | Domain taxonomy is inconsistent and fragmented. | Map imported values to controlled ECO/performance-domain records and validate imports. |
| PAY-04 | Medium | Checkout | Fee and charged MYR total are not represented by the application receipt. | Show fee before redirect and issue a receipt that reconciles displayed price with charged amount. |
| BRAND-01 | Medium | Email | PMAdvance email branding differs from PM Exam Pro. | Use one customer-facing product identity and include the legal company name in the footer. |
| A11Y-01 | Medium | Accessibility | Submission dialog lacks initial focus, focus trap, and Escape close. | Implement accessible modal focus management and restore focus on close. |
| UX-01 | Medium | Checkout | Optional demographics extend the payment form. | Move optional profiling to onboarding/account after purchase. |
| UX-02 | Medium | Preview | One-minute timer conflicts with 180-minute metadata. | Label “5-question preview · 1-minute demo” separately from full-test duration. |
| NAV-01 | Medium | Mobile | Public mobile header has no route menu. | Add a compact menu for Catalog, FAQ, and Tutorial. |
| A11Y-02 | Low | Semantics | Voucher lacks label; login lacks `h1`; password autocomplete hints are absent. | Add label/id, semantic heading, and correct autocomplete attributes. |
| OPS-01 | Low | Assets/logging | Missing favicon and routine anonymous 401 console noise. | Add favicon and avoid or silence expected unauthenticated fetch failures. |

## 5. Recommended UI/UX changes

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
