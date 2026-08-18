import { cookies } from "next/headers";
import { apiUrl } from "../../../../lib/api";
import { StudentDashboardScreen } from "./screen";

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const fetchOptions: RequestInit = { cache: "no-store", headers: { Cookie: cookieHeader } };

  const [enrollments, attempts, me, examGoal] = await Promise.all([
    fetch(`${apiUrl}/api/enrollments`, fetchOptions).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    fetch(`${apiUrl}/api/attempts`, fetchOptions).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    fetch(`${apiUrl}/api/auth/me`, fetchOptions).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`${apiUrl}/api/exam-goal`, fetchOptions).then((r) => (r.ok ? r.json() : null)).catch(() => null)
  ]);

  return <StudentDashboardScreen initialEnrollments={enrollments} initialAttempts={attempts} initialExamGoal={examGoal} userName={me?.fullName ?? me?.email ?? ""} />;
}
