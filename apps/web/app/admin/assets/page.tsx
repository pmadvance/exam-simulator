import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeFetch, type AdminAsset } from "../../../lib/admin-api";
import { AssetsContent } from "./AssetsContent";

export const metadata: Metadata = {
  title: "Assets | Admin",
};

export default async function AssetsPage() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get("pm_access");
  const refreshCookie = cookieStore.get("pm_refresh");

  if (!accessCookie && !refreshCookie) {
    redirect("/admin/login");
  }

  // Fetch initial assets server-side
  const initialAssets = await safeFetch<AdminAsset[]>("/api/admin/assets", []);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Assets</h1>
        <p className="page-subtitle">Manage images used in questions</p>
      </div>
      <AssetsContent initialAssets={initialAssets} />
    </div>
  );
}
