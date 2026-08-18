import { getAdminSettings } from "../../../lib/admin-api";
import { SettingsContent } from "./SettingsContent";

export default async function SettingsPage() {
  const settings = await getAdminSettings();

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Platform configuration and customization</p>
      <SettingsContent initialSettings={settings} />
    </>
  );
}
