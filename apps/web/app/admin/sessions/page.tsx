import { getAdminSessions } from "../../../lib/admin-api";
import { SessionsContent } from "./SessionsContent";

export default async function SessionsPage() {
  const sessions = await getAdminSessions();

  return (
    <>
      <h1 className="page-title">Sessions</h1>
      <p className="page-subtitle">Monitor active user sessions</p>
      <SessionsContent initialSessions={sessions} />
    </>
  );
}
