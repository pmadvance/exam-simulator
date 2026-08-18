import { Suspense } from "react";
import { getAdminExams, getAdminProducts } from "../../../lib/admin-api";
import { ExamsContent } from "./ExamsContent";

export default async function ExamsPage() {
  const [exams, products] = await Promise.all([
    getAdminExams(),
    getAdminProducts(),
  ]);

  return (
    <>
      <h1 className="page-title">Tests</h1>
      <p className="page-subtitle">Manage individual practice tests</p>
      <Suspense fallback={<div style={{ padding: "20px" }}>Loading...</div>}>
        <ExamsContent initialExams={exams} products={products} />
      </Suspense>
    </>
  );
}
