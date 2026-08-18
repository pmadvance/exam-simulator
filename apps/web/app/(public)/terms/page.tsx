import { Footer } from "../Footer";
import { PublicNavbar } from "../PublicNavbar";

export default function TermsPage() {
  return (
    <main>
      <PublicNavbar />
      <section className="container py-5" style={{ maxWidth: 920 }}>
        <p className="text-uppercase fw-semibold mb-2" style={{ color: "#2B7A87", fontSize: 12, letterSpacing: "0.14em" }}>
          Legal
        </p>
        <h1 className="fw-bold mb-3">Terms of Use</h1>
        <p className="text-muted">Version 2026-05-26. These terms apply to use of the PM Advance practice exam platform.</p>

        <div className="d-grid gap-4 mt-4">
          <section>
            <h2 className="h5 fw-semibold">Account Use</h2>
            <p className="mb-0">You are responsible for keeping your login details secure. Accounts and exam access are for the registered user or approved corporate learner only and may not be shared without permission.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Exam Content</h2>
            <p className="mb-0">Questions, explanations, images, and platform materials are provided for learning and practice. You may not copy, scrape, redistribute, resell, or publish platform content without written permission.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Payments and Access</h2>
            <p className="mb-0">Access is activated after successful payment or approved corporate enrolment. Product duration, pricing, vouchers, and availability may vary by package or campaign.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Acceptable Use</h2>
            <p className="mb-0">Do not attempt to bypass security controls, interfere with the platform, misuse vouchers/referrals, or access another user&apos;s account or data.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Support</h2>
            <p className="mb-0">For account, payment, or access issues, contact info@pmadvance.com.</p>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
