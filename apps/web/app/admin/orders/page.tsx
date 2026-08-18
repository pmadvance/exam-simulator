import { getAdminOrders } from "../../../lib/admin-api";
import { OrdersContent } from "./OrdersContent";

export default async function OrdersPage() {
  const orders = await getAdminOrders();

  return (
    <>
      <h1 className="page-title">Orders</h1>
      <p className="page-subtitle">View and manage customer orders</p>
      <OrdersContent initialOrders={orders} />
    </>
  );
}
