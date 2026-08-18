import { Footer } from "../Footer";
import { PublicNavbar } from "../PublicNavbar";

export default function PrivacyPage() {
  return (
    <main>
      <PublicNavbar />
      <section className="container py-5" style={{ maxWidth: 920 }}>
        <p className="text-uppercase fw-semibold mb-2" style={{ color: "#2B7A87", fontSize: 12, letterSpacing: "0.14em" }}>
          Legal
        </p>
        <h1 className="fw-bold mb-3">Privacy Notice</h1>
        <p className="text-muted">Version 2026-05-26. This notice explains how PM Advance Sdn Bhd handles personal data for this practice exam platform.</p>

        <div className="d-grid gap-4 mt-4">
          <section>
            <h2 className="h5 fw-semibold">Personal Data We Collect</h2>
            <p className="mb-0">We may collect your name, email address, account credentials, order and payment status, enrolment details, exam attempts, scores, session/IP information, referral activity, organization membership, and support messages.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Purpose of Collection</h2>
            <p className="mb-0">We use this data to create and secure your account, provide exam access, process payments, record progress and results, support referrals or corporate enrolments, respond to support requests, audit sensitive actions, and comply with legal or business record obligations.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Disclosure</h2>
            <p className="mb-0">We may share necessary data with service providers such as hosting providers, email delivery services, payment gateways, and support tools. We do not sell your personal data.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Security and Retention</h2>
            <p className="mb-0">We use access controls, password hashing, session controls, audit logs, and operational safeguards. Records are retained while your account is active and as needed for payment, audit, tax, legal, dispute, and platform integrity purposes.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Your PDPA Requests</h2>
            <p className="mb-0">You may request access, correction, deletion, or withdrawal of consent through My Account or by contacting info@pmadvance.com. Some records may need to be retained where required for legal, financial, security, or legitimate business reasons.</p>
          </section>
          <section>
            <h2 className="h5 fw-semibold">Contact</h2>
            <p className="mb-0">For privacy questions, contact PM Advance Sdn Bhd at info@pmadvance.com.</p>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
