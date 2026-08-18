import { Suspense } from "react";
import {
  getSalesReport,
  getEnrollmentReport,
  getAttemptReport,
} from "../../../lib/admin-api";
import { ReportsContent } from "./ReportsContent";

export default async function ReportsPage() {
  const [salesReport, enrollmentReport, attemptReport] = await Promise.all([
    getSalesReport(),
    getEnrollmentReport(),
    getAttemptReport(),
  ]);

  return (
    <>
      <h1 className="page-title">Reports & Analytics</h1>
      <p className="page-subtitle">Comprehensive insights into platform performance</p>
      <Suspense fallback={<div style={{ padding: "20px" }}>Loading...</div>}>
        <ReportsContent
          initialSalesReport={salesReport}
          initialEnrollmentReport={enrollmentReport}
          initialAttemptReport={attemptReport}
        />
      </Suspense>
    </>
  );
}
