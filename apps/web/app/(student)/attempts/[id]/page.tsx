import { cookies } from "next/headers";
import { apiUrl, type AttemptResultDetail } from "../../../../lib/api";
import { AttemptReviewScreen } from "./screen";

export const dynamic = "force-dynamic";

export default async function AttemptReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  let result: AttemptResultDetail | null = null;
  try {
    const response = await fetch(`${apiUrl}/api/attempts/${id}/results`, {
      cache: "no-store",
      headers: { Cookie: cookieHeader },
    });
    if (response.ok) result = await response.json();
  } catch {
    // ignore
  }

  if (!result) {
    return (
      <main className="shell stack">
        <h1>Attempt not found</h1>
        <p className="statusLine">This attempt may not exist or is still in progress.</p>
        <a href="/me/dashboard" className="secondaryButton">Back to dashboard</a>
      </main>
    );
  }

  return <AttemptReviewScreen result={result} />;
}
