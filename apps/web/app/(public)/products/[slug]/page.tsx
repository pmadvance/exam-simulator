import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { getProduct, apiUrl } from "../../../../lib/api";
import { PublicNavbar } from "../../PublicNavbar";
import { Footer } from "../../Footer";
import { PriceDisplay } from "../../../components/PriceDisplay";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Check if user has active enrollment for this product
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const fetchOptions: RequestInit = { cache: "no-store", headers: { Cookie: cookieHeader } };
  
  const enrollment = await fetch(`${apiUrl}/api/products/${slug}/enrollment`, fetchOptions)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  
  const hasAccess = enrollment?.hasAccess === true;

  const publishedExams = product.exams.filter((exam) => exam.status !== "draft");
  const readyExams = publishedExams.filter((exam) => exam.questionCount > 0);

  return (
    <>
    <PublicNavbar />
    <main className="shell">
      <section className="sectionHeader">
        <div>
          <p className="eyebrow">Exam details</p>
          <h1>{product.title}</h1>
          <p className="statusLine" style={{ marginTop: 8 }}>
            {product.category} · {product.difficulty} · {product.accessDays} days access
          </p>
        </div>
        <Link href="/#catalog" className="textLink">
          Back to catalog
        </Link>
      </section>

      <section className="checkoutGrid">
        <article className="checkoutCard">
          <h2>What You Get</h2>
          <p className="statusLine">{product.description}</p>

          <div className="detailList" style={{ marginTop: 12 }}>
            <span>Access Duration: {product.accessDays} Days Full Access</span>
            <span>Difficulty Level: {product.difficulty}</span>
            <span>{readyExams.reduce((total, exam) => total + exam.questionCount, 0)} published practice questions with explanations</span>
            <span>Available Tests: {readyExams.length} Practice {readyExams.length === 1 ? "Test" : "Tests"}</span>
          </div>

          {!hasAccess && (
            <>
              <h3 style={{ marginTop: 20 }}>Practice Tests</h3>
              {readyExams.length === 0 ? (
                <p className="statusLine">Questions are coming soon. A free preview will appear when published questions are available.</p>
              ) : (
                <div className="stack" style={{ marginTop: 10 }}>
                  {readyExams.map((exam) => (
                    <div className="questionCard" key={exam.id}>
                      <h3 style={{ marginTop: 4 }}>{exam.title}</h3>
                      <p className="statusLine" style={{ marginTop: 8 }}>
                        {exam.examType === "full_simulation" ? "Full simulation" : exam.examType === "quiz" ? "Quiz" : "Section practice"} · {exam.questionCount} questions · {exam.timeLimitMinutes} minutes · practice target {exam.passThreshold}%
                      </p>
                      <div className="simulatorActions" style={{ marginTop: 8 }}>
                        <Link href={`/exams/${exam.slug}`} className="secondaryButton">
                          Try free preview
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </article>

        <aside className="resultCard">
          {hasAccess ? (
            <>
              <p className="eyebrow">Access Active</p>
              <h2 style={{ color: "#059669" }}>✓ You have access</h2>
              <p className="statusLine">Your subscription is active until {new Date(enrollment.expiresAt).toLocaleDateString()}.</p>
              <div className="simulatorActions" style={{ marginTop: 12 }}>
                <Link href={`/me/dashboard?product=${product.slug}`} className="cta buttonCta">
                  Go to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">Price</p>
              <h2><PriceDisplay amountUsd={product.priceUsd} localClassName="d-block statusLine" /></h2>
              <p className="statusLine fw-semibold">One-Time Purchase</p>
              <ul className="list-unstyled d-grid gap-2 mt-3 mb-0" style={{ color: "#6B7280", fontSize: 14 }}>
                <li><i className="bi bi-check2-circle me-2" style={{ color: "#059669" }} />Instant dashboard activation after payment</li>
                <li><i className="bi bi-check2-circle me-2" style={{ color: "#059669" }} />Zero monthly recurring fees</li>
                <li><i className="bi bi-check2-circle me-2" style={{ color: "#059669" }} />100% Secure Checkout</li>
              </ul>
              <div className="simulatorActions" style={{ marginTop: 12 }}>
                <Link href={`/checkout?product=${product.slug}`} className="cta buttonCta">
                  Get Instant Access
                </Link>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
    <Footer />
    </>
  );
}
