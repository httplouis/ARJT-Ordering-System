import { getAdminData } from "@/lib/data";
import { LiveOrders } from "@/components/admin/live-orders";

export default async function OrdersPage() {
  const { orders } = await getAdminData();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      <div>
        <p className="text-sm font-bold text-primary">Operations</p>
        <h1 className="text-3xl font-black">Order Management</h1>
      </div>
      <LiveOrders initialOrders={orders} />
    </div>
  );
}
