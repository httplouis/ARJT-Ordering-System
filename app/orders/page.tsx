import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, statusLabel, statusTone } from "@/lib/utils";
import { OrderTracker } from "@/components/storefront/order-tracker";
import { getOrder } from "@/lib/data";
import CompactOrderCard from "@/components/storefront/compact-order-card";
import type { Order } from "@/lib/types";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const authClient = await createClient();
  if (!authClient) {
    redirect("/login");
  }

  const { data: userData } = await authClient.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/login");
  }

  const supabase = createAdminClient();
  if (!supabase) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data as Order[] | null) ?? [];
  const params = await searchParams;
  const trackedOrder = params.orderId ? await getOrder(params.orderId) : null;

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="mb-4">
          <Button asChild variant="outline" size="sm" className="inline-flex items-center gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        {trackedOrder ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="rounded-3xl border bg-background p-6 shadow-soft">
                <p className="text-sm text-muted-foreground">Current order status</p>
                <h1 className="mt-2 text-3xl font-black">Tracking Order #{trackedOrder.queue_number}</h1>
                <p className="mt-1 text-sm text-muted-foreground">Detailed status and order summary in one place.</p>
                <div className="mt-6">
                  <OrderTracker order={trackedOrder} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border bg-background p-6 shadow-soft">
                <p className="text-sm text-muted-foreground">Your Orders</p>
                <h1 className="mt-2 text-3xl font-black">Order history</h1>
                <p className="mt-1 text-sm text-muted-foreground">Tap any order to view live tracking details.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border bg-background p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">Your Orders</p>
            <h1 className="mt-2 text-3xl font-black">Order history</h1>
            <p className="mt-1 text-sm text-muted-foreground">Select an order from the list below to follow its progress.</p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-10 text-center">
            <p className="text-lg font-semibold">No saved orders yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              When you place an order, it will appear here for your account.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active orders */}
            {(() => {
              const activeOrders = orders.filter((o) => o.status !== "completed");
              if (!activeOrders.length) return null;
              return (
                <section className="space-y-4">
                  <h2 className="text-xl font-bold">Active orders</h2>
                  <div className="space-y-3">
                        {activeOrders.map((order) => (
                          <CompactOrderCard key={order.id} order={order} />
                        ))}
                  </div>
                </section>
              );
            })()}

            {/* History */}
            {(() => {
              const history = orders.filter((o) => o.status === "completed");
              if (!history.length) return null;
              return (
                <section className="space-y-4">
                  <h2 className="text-xl font-bold">Order history</h2>
                  <div className="space-y-3">
                    {history.map((order) => (
                      <CompactOrderCard key={order.id} order={order} isHistory />
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        )}
      </div>
    </main>
  );
}
