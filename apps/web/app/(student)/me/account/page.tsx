import { cookies } from "next/headers";
import { apiUrl, type StudentOrder } from "../../../../lib/api";
import { AccountScreen, type ReferralMe } from "./screen";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  let orders: StudentOrder[] = [];
  let referral: ReferralMe | null = null;
  try {
    const response = await fetch(`${apiUrl}/api/orders`, { cache: "no-store", headers: { Cookie: cookieHeader } });
    if (response.ok) orders = await response.json();
  } catch {
    // ignore
  }
  try {
    const response = await fetch(`${apiUrl}/api/referral/me`, { cache: "no-store", headers: { Cookie: cookieHeader } });
    if (response.ok) referral = (await response.json()) as ReferralMe;
  } catch {
    // ignore
  }

  return <AccountScreen initialOrders={orders} initialReferral={referral} />;
}
