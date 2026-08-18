import { getAdminEcoDomains, getAdminProducts } from "../../../lib/admin-api";
import { EcoDomainsContent } from "./EcoDomainsContent";

export default async function EcoDomainsPage() {
  const [domains, products] = await Promise.all([
    getAdminEcoDomains(),
    getAdminProducts(),
  ]);

  return (
    <>
      <h1 className="page-title">ECO Domains</h1>
      <p className="page-subtitle">PMI Examination Content Outline domains for question tagging</p>
      <EcoDomainsContent initialDomains={domains} products={products} />
    </>
  );
}
