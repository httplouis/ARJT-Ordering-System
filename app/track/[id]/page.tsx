import Link from "next/link";
import { getOrder } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { OrderTracker } from "@/components/storefront/order-tracker";

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-3xl border p-6 text-center shadow-soft">
          <h1 className="text-xl font-black">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">Check the order link or ask the counter for help.</p>
          <Button asChild className="mt-5 w-full">
            <Link href="/">Back to menu</Link>
          </Button>
        </div>
      </main>
    );
  }

  return <OrderTracker order={order} />;
}
