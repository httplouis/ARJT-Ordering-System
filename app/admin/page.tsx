import { getAdminData } from "@/lib/data";
import { AdminOverview } from "@/components/admin/admin-overview";

export default async function AdminPage() {
  const data = await getAdminData();
  return <AdminOverview {...data} />;
}
