"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatusAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/types";
import { formatCurrency, statusLabel, statusTone } from "@/lib/utils";

const nextStatuses: OrderStatus[] = ["confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "completed", "cancelled"];

export function LiveOrders({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const filtered = useMemo(
    () =>
      orders.filter((order) =>
        `${order.customer_name} ${order.queue_number} ${order.contact_number}`.toLowerCase().includes(query.toLowerCase())
      ),
    [orders, query]
  );

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders((current) => [payload.new as Order, ...current]);
          audioRef.current?.play().catch(() => undefined);
          toast.success("New order received");
        }
        if (payload.eventType === "UPDATE") {
          setOrders((current) => current.map((order) => (order.id === payload.new.id ? { ...order, ...(payload.new as Order) } : order)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Live Order Queue</CardTitle>
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search queue..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <audio ref={audioRef} src="/notify.mp3" preload="auto" />
        {filtered.map((order) => (
          <div key={order.id} className="rounded-3xl border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black">#{order.queue_number}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-1 font-semibold">{order.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {order.fulfillment_type} · {order.contact_number} · {formatCurrency(order.total)}
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nextStatuses.map((status) => (
                  <Button key={status} size="sm" variant={order.status === status ? "default" : "secondary"} onClick={() => updateOrderStatusAction(order.id, status)}>
                    {statusLabel(status)}
                  </Button>
                ))}
                <Button size="icon" variant="outline" onClick={() => window.print()} aria-label="Print receipt">
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {order.order_items?.length ? (
              <div className="mt-3 grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between rounded-2xl bg-muted p-3">
                    <span>{item.quantity}x {item.product_name}</span>
                    <strong>{formatCurrency((item.unit_price + item.options_total) * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {!filtered.length ? (
          <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">No orders in this view.</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
