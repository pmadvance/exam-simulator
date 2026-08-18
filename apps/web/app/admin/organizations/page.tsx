import { getAdminOrganizations, getAdminProducts } from "../../../lib/admin-api";
import { OrganizationsContent } from "./OrganizationsContent";

export default async function OrganizationsPage() {
  const [organizations, products] = await Promise.all([
    getAdminOrganizations(),
    getAdminProducts(),
  ]);

  return (
    <>
      <h1 className="page-title">Organizations</h1>
      <p className="page-subtitle">Manage B2B organizations and corporate accounts</p>
      <OrganizationsContent initialOrganizations={organizations} initialProducts={products} />
    </>
  );
}
