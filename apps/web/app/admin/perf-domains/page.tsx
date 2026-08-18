import { getAdminPerfDomains, getAdminProducts } from "../../../lib/admin-api";
import { PerfDomainsContent } from "./PerfDomainsContent";

export default async function PerfDomainsPage() {
  const [domains, products] = await Promise.all([
    getAdminPerfDomains(),
    getAdminProducts(),
  ]);

  return (
    <>
      <h1 className="page-title">Performance Domains</h1>
      <p className="page-subtitle">PMI Performance Domains for detailed question categorization</p>
      <PerfDomainsContent initialDomains={domains} products={products} />
    </>
  );
}
