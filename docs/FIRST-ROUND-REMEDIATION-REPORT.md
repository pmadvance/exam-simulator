# PM Exam Pro First-Round Remediation Report

**Prepared:** 7 September 2026  
**Audience:** Product owner, client stakeholders, development, and QA  
**Source plan:** `FIRST-ROUND-AUDIT-FIX-PLAN.md`

## Executive summary

This release corrects the highest-impact non-payment findings from the first production journey audit. The registration path is shorter, production no longer exposes a UAT verification shortcut, PM Exam Pro branding is consistent, empty exams cannot be started or published, simulator completion and mobile controls are clearer, and performance information is scoped to the selected product and translated into specific learner actions.

Payment gateway behavior, payment reconciliation, and callback assurance remain intentionally excluded on the product owner's instruction. They remain separate launch risks and should be completed before broad paid acquisition.

## Delivered changes

### Registration and account safety

- Production never returns or accepts a UAT bypass code, even if an old UAT environment switch is accidentally enabled.
- Registration, checkout registration, reset password, account password change, and admin-created accounts use the same policy: at least eight characters, with a letter and a number.
- The same plain-language requirement is shown in the affected forms.
- Age, occupation, and gender were removed from initial registration and checkout.
- A skippable onboarding page now collects optional demographics, target certification, and planned exam date after login.
- Login routes a new student to onboarding only when no optional profile information exists; onboarding never blocks access.
- Email and password inputs now include browser autocomplete hints.

### Brand and production presentation

- Customer-facing `PMAdvance` and `PM Advance` wording was changed to `PM Exam Pro` in pages, metadata, learner layout, seed copy, receipts, verification/reset/voucher emails, and gateway descriptors.
- The default mail sender display name is now PM Exam Pro.
- Unsupported `1,000+` inventory claims were replaced with non-numeric, accurate language.
- A PM Exam Pro favicon was added.
- A release check fails when prohibited UAT or legacy-brand text is reintroduced into application source.

Technical email addresses using the existing `pmadvance.com` domain were retained because deliverability and mailbox ownership were not part of the approved brand change. They are infrastructure identifiers, not displayed product names.

### Catalog and exam integrity

- Student exam lists display Coming soon instead of Start Test when no published questions exist.
- Product pages do not offer a free preview for an empty exam.
- Attempt creation rejects a zero-question exam at the API boundary.
- Obsolete zero-question in-progress attempts are removed when queried.
- Administrators cannot create or publish a live exam without a published question.
- Administrators must unpublish an exam before removing its final published question.
- Submission scoring and result review exclude draft questions.

### Simulator experience

- Training completion no longer points to a deleted result record; it offers Continue training and Dashboard.
- Preview copy explicitly identifies the experience as a short question preview and one-minute demo, separate from paid statistics.
- Start copy explains exactly when the timer begins and how Training Mode differs.
- Single-letter S/H tools were replaced with visible Strikethrough and Highlight actions with accessible labels.
- A dismissible/reopenable guide explains training, auto-forward, elimination, highlighting, review marking, Save and Exit, and automatic time-expiry submission.
- Autosave shows Saving, Saved, Offline, and Save failed states; reconnecting retries the current progress.
- The browser warns when leaving with unsaved progress.
- Submission confirmation moves focus inside, traps keyboard focus, and supports Escape.
- Mobile exam headers and Save/End controls are compact and sticky.

### Results and actionable analytics

- Attempt lists and all domain aggregates are calculated on the selected product at the server, preventing PMP/CAPM cross-contamination.
- Pass/fail on the dashboard uses each exam's configured threshold instead of a fixed 65%.
- Multiple-response scoring uses one normalized, order-independent comparison in submission, result review, and analytics.
- Learner-facing “Project Performance Domain” is now “Delivery Approach”; the existing database/API field is retained for compatibility.
- A new Exam readiness panel reports:
  - weighted recent score (newer attempts matter more)
  - first-seen accuracy
  - unique-question coverage
  - score consistency
  - unanswered rate
  - recurring mistakes
  - weak ECO areas and concrete next-step guidance
- The readiness score stays hidden as “Building evidence” until there are at least two exam-mode attempts and 25% unique-question coverage. Confidence is shown and the wording explicitly states this is practice guidance, not an official or guaranteed certification result.

## Why ECO domain and Delivery Approach matter

ECO domain identifies **what the certification tests**. Delivery Approach identifies **the context in which the learner applies that knowledge**—Predictive, Agile/Adaptive, Hybrid, or Agnostic. Keeping them separate lets PM Exam Pro identify patterns such as strong Process knowledge in predictive scenarios but weak judgment in hybrid scenarios. It also makes question-bank coverage measurable and prevents attractive but misleading analytics.

The current free-text values are retained in this release to avoid guessing at ambiguous imported content. Before blueprint-weighted readiness is enabled, a content owner should map every published question to controlled certification/version, ECO domain/task, and Delivery Approach values.

## Verification completed

- API regression tests: 11 passed, 0 failed.
- Monorepo TypeScript checks: all 3 applicable packages passed.
- Production build: completed successfully; 40 routes generated.
- Source production-copy scan: passed.
- Compiled API and web output scan: no prohibited UAT code, development hint, `PMAdvance`, or `PM Advance` text found.
- Git whitespace/error check: passed.

The build logs contain expected Next.js dynamic-route notices when the local API is not running; the build itself succeeds.

## Deliberately deferred or dependent work

- All payment findings listed in the source plan remain deferred.
- Blueprint-weighted readiness, ECO-task mastery, and automated full-simulation assembly require an approved, versioned content mapping; ambiguous production classifications were not silently rewritten.
- Timing/stamina metrics require new per-question telemetry and an updated privacy notice before collection. This release does not invent timing data from attempt start/end timestamps.
- Access-expiry emails require a production scheduler and approved message timing.
- Moderated usability sessions and manual VoiceOver/NVDA coverage require participants/devices; the recommended scripts remain in the client journey review.

## Client acceptance checklist

- Register with a new email and confirm no demographic fields appear before account creation.
- Confirm a password without a number is rejected in registration, reset, and account change.
- Sign in and verify optional onboarding can be saved or skipped.
- Confirm an empty published exam cannot be started and an admin cannot publish a new empty exam.
- Complete Training Mode and verify no broken Review answers link appears.
- Complete two exam-mode attempts for one product, change products, and verify attempts/domains do not mix.
- Verify the readiness explanation, confidence label, and next actions are understandable.
- Check the public navigation and simulator at phone width and with keyboard-only controls.
- Confirm verification/reset/voucher emails and receipts display PM Exam Pro.
