import { getAdminData } from "@/lib/data";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  const { settings } = await getAdminData();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <p className="text-sm font-bold text-primary">Store controls</p>
        <h1 className="text-3xl font-black">Settings</h1>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
