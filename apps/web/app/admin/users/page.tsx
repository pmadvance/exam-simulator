import { getAdminUsers, getAdminProducts } from "../../../lib/admin-api";
import { UsersContent } from "./UsersContent";

export default async function UsersPage() {
  const [users, products] = await Promise.all([
    getAdminUsers(),
    getAdminProducts(),
  ]);

  return (
    <>
      <h1 className="page-title">Users</h1>
      <p className="page-subtitle">Manage platform users and their access</p>
      <UsersContent initialUsers={users} products={products} />
    </>
  );
}
