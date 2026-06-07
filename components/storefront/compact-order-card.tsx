"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, statusLabel, statusTone } from "@/lib/utils";
import type { Order } from "@/lib/types";

export default function CompactOrderCard({ order, isHistory }: { order: Order; isHistory?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-2xl border bg-background p-3 ${isHistory ? "shadow-sm" : "shadow-soft"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold truncate">Order #{order.queue_number}</h3>
            <Badge className={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{order.customer_name}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-black">{formatCurrency(order.total)}</p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/orders?orderId=${order.id}`}>Track</Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen((s) => !s)}>
              {open ? "Hide" : "Details"}
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t pt-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Contact</p>
              <p className="font-semibold truncate">{order.contact_number || "Not provided"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Items</p>
              <p className="font-semibold">{order.order_items?.length ?? 0} items</p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground">Items</p>
            <div className="mt-2 space-y-2">
              {order.order_items?.map((it) => (
                <div key={it.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{it.quantity}x {it.product_name}</p>
                    {it.selected_options?.length ? <p className="text-xs text-muted-foreground">{it.selected_options.map((o) => o.name).join(", ")}</p> : null}
                  </div>
                  <p className="font-semibold">{formatCurrency((it.unit_price + it.options_total) * it.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {order.payments?.[0] && (
            <div>
              <p className="text-muted-foreground">Payment</p>
              <p className="font-semibold">{order.payments[0].status} · {formatCurrency(order.payments[0].amount)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
