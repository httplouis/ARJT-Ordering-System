import { getAdminData } from "@/lib/data";
import { LiveOrders } from "@/components/admin/live-orders";

export default async function OrdersPage() {
  const { orders } = await getAdminData();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm font-bold text-primary">Operations</p>
        <h1 className="text-3xl font-black">Order Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage incoming orders, update status, and track payments.</p>
      </div>
      <LiveOrders initialOrders={orders} />
    </div>
  );
}
