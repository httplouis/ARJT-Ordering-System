import { getAdminData } from "@/lib/data";
import { AdminOverview } from "@/components/admin/admin-overview";

export default async function AdminPage() {
  const { analytics, orders, products, settings } = await getAdminData();

  return <AdminOverview analytics={analytics} orders={orders} products={products} settings={settings} />;
}
