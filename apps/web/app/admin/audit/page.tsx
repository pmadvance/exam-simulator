import { getAdminAuditLogs } from "../../../lib/admin-api";
import { AuditContent } from "./AuditContent";

export default async function AuditPage() {
  const auditLogs = await getAdminAuditLogs();

  return (
    <>
      <h1 className="page-title">Audit Log</h1>
      <p className="page-subtitle">Track all administrative actions</p>
      <AuditContent initialAuditLogs={auditLogs} />
    </>
  );
}
