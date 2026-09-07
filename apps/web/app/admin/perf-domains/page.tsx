import { getAdminPerfDomains, getAdminProducts } from "../../../lib/admin-api";
import { PerfDomainsContent } from "./PerfDomainsContent";

export default async function PerfDomainsPage() {
  const [domains, products] = await Promise.all([
    getAdminPerfDomains(),
    getAdminProducts(),
  ]);

  return (
    <>
      <h1 className="page-title">Delivery Approaches</h1>
      <p className="page-subtitle">Classify questions as Predictive, Agile, Hybrid, or Agnostic for useful learner analytics.</p>
      <PerfDomainsContent initialDomains={domains} products={products} />
    </>
  );
}
