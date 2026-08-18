import { Suspense } from "react";
import { getAdminProducts, getAdminExams } from "../../../lib/admin-api";
import { ProductsContent } from "./ProductsContent";

export default async function ProductsPage() {
  const [products, exams] = await Promise.all([
    getAdminProducts(),
    getAdminExams(),
  ]);

  return (
    <>
      <h1 className="page-title">Exams</h1>
      <p className="page-subtitle">Manage your exam preparation products</p>
      <Suspense fallback={<div style={{ padding: "20px" }}>Loading...</div>}>
        <ProductsContent initialProducts={products} exams={exams} />
      </Suspense>
    </>
  );
}
