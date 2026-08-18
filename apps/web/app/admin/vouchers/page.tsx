import { getAdminVouchers, getAdminProducts } from "../../../lib/admin-api";
import { VouchersContent } from "./VouchersContent";

export default async function VouchersPage() {
  const [voucherPage, products] = await Promise.all([getAdminVouchers(), getAdminProducts()]);

  return (
    <>
      <h1 className="page-title">Vouchers</h1>
      <p className="page-subtitle">Create and manage discount vouchers</p>
      <VouchersContent initialPage={voucherPage} products={products} />
    </>
  );
}
