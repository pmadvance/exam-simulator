import Link from "next/link";
import { BrandLogo } from "../components/BrandLogo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "var(--brand-navy)", color: "#B8BDC4", fontSize: 14 }}>
      <div className="container py-5">
        <div className="row g-4">
          {/* Brand Column */}
          <div className="col-lg-4 col-md-6">
            <Link href="/" className="d-inline-block mb-3">
              <BrandLogo variant="dark" size="compact" />
            </Link>
            <p className="mb-2" style={{ maxWidth: 280 }}>
              Practice exams and training for PMP®, CAPM®, PMI-RMP®, PMI-ACP® — built by PM Advance Sdn Bhd.
            </p>
            <span
              className="d-inline-block px-2 py-1 rounded-1 small fw-semibold"
              style={{ background: "rgba(232,121,43,0.15)", color: "#F4A261", fontSize: 11, letterSpacing: "0.04em" }}
            >
              PMI Authorized Training Partner #4930
            </span>
          </div>

          {/* Quick Links */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="text-white fw-semibold mb-3" style={{ fontSize: 13, letterSpacing: "0.04em" }}>Platform</h6>
            <ul className="list-unstyled d-grid gap-2 mb-0">
              <li><Link href="/#catalog" className="text-decoration-none" style={{ color: "#9CA3AF" }}>Browse Exams</Link></li>
              <li><Link href="/login" className="text-decoration-none" style={{ color: "#9CA3AF" }}>Sign In</Link></li>
              <li><Link href="/me/dashboard" className="text-decoration-none" style={{ color: "#9CA3AF" }}>Dashboard</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="text-white fw-semibold mb-3" style={{ fontSize: 13, letterSpacing: "0.04em" }}>Support</h6>
            <ul className="list-unstyled d-grid gap-2 mb-0">
              <li><Link href="/faq" className="text-decoration-none" style={{ color: "#9CA3AF" }}>FAQ</Link></li>
              <li><Link href="/tutorial" className="text-decoration-none" style={{ color: "#9CA3AF" }}>Tutorial</Link></li>
              <li><Link href="/me/account" className="text-decoration-none" style={{ color: "#9CA3AF" }}>My Account</Link></li>
              <li><Link href="/privacy" className="text-decoration-none" style={{ color: "#9CA3AF" }}>Privacy Notice</Link></li>
              <li><Link href="/terms" className="text-decoration-none" style={{ color: "#9CA3AF" }}>Terms of Use</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-lg-4 col-md-6">
            <h6 className="text-white fw-semibold mb-3" style={{ fontSize: 13, letterSpacing: "0.04em" }}>PM Advance Sdn Bhd</h6>
            <ul className="list-unstyled d-grid gap-2 mb-0">
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-geo-alt-fill mt-1" style={{ color: "#E8792B", fontSize: 13 }} />
                <span>Kuala Lumpur, Malaysia</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-envelope-fill mt-1" style={{ color: "#E8792B", fontSize: 13 }} />
                <span>info@pmadvance.com</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-award-fill mt-1" style={{ color: "#E8792B", fontSize: 13 }} />
                <span>15+ years · 3,000+ graduates · HRDCorp claimable</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <hr style={{ borderColor: "#374151", margin: "24px 0 16px" }} />
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ fontSize: 12 }}>
          <span>&copy; {year} PM Advance Sdn Bhd. All rights reserved.</span>
          <span style={{ color: "#6B7280" }}>PMI, PMP, CAPM are registered marks of the Project Management Institute, Inc.</span>
        </div>
      </div>
    </footer>
  );
}
