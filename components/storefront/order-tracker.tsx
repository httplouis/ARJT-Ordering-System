"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Home, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Order, OrderStatus } from "@/lib/types";
import { formatCurrency, statusLabel, statusTone } from "@/lib/utils";

const steps: OrderStatus[] = ["pending", "preparing", "completed"];

export function OrderTracker({ order: initialOrder }: { order: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const normalizedStatus = useMemo<OrderStatus>(() => {
    if (order.status === "completed") return "completed";
    if (["preparing", "ready_for_pickup", "out_for_delivery"].includes(order.status)) return "preparing";
    return "pending";
  }, [order.status]);
  const activeIndex = Math.max(0, steps.indexOf(normalizedStatus));
  const wait = useMemo(() => {
    if (!order.estimated_ready_at) return "Calculating";
    const diff = Math.max(1, Math.ceil((new Date(order.estimated_ready_at).getTime() - Date.now()) / 60000));
    return `${diff} min`;
  }, [order.estimated_ready_at]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || order.id.startsWith("demo")) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (payload) => setOrder((current) => ({ ...current, ...(payload.new as Partial<Order>) }))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] bg-primary p-6 text-white shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm opacity-80">Queue number</p>
            <h1 className="text-5xl font-black">#{order.queue_number}</h1>
          </div>
          <div className="flex items-center gap-3 rounded-[2rem] bg-white/10 px-4 py-3 text-sm">
            <PackageCheck className="h-10 w-10 opacity-80" />
            <div>
              <p className="font-semibold">{statusLabel(normalizedStatus)}</p>
              <p className="text-xs opacity-80">Current order stage</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Smart estimate</p>
            <p className="text-2xl font-black">{wait}</p>
          </div>
          <Clock className="h-9 w-9 text-primary" />
        </div>
        <div className="mt-6 space-y-4">
          {steps.map((step, index) => {
            const active = index <= activeIndex;
            return (
              <div
                key={step}
                className={`flex gap-3 rounded-3xl border p-4 ${
                  active ? "border-primary/20 bg-primary/5" : "border-muted/60 bg-muted/50"
                }`}
              >
                <motion.div
                  animate={{ scale: active ? 1 : 0.88 }}
                  className={`mt-0.5 grid h-10 w-10 place-items-center rounded-full ${
                    active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </motion.div>
                <div>
                  <p className="font-bold">{statusLabel(step)}</p>
                  <p className="text-sm text-muted-foreground">
                    {index === activeIndex ? "Live now" : active ? "Done" : "Waiting"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border bg-card p-5 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-3xl bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Type</p>
            <p className="font-semibold">{order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}</p>
          </div>
          <div className="space-y-2 rounded-3xl bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Requested time</p>
            <p className="font-semibold">{new Date(order.desired_time).toLocaleString()}</p>
          </div>
          <div className="space-y-2 rounded-3xl bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Est. ready</p>
            <p className="font-semibold">{order.estimated_ready_at ? new Date(order.estimated_ready_at).toLocaleString() : "Calculating"}</p>
          </div>
          <div className="space-y-2 rounded-3xl bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact</p>
            <p className="font-semibold truncate">{order.contact_number || "Not provided"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-black">Order Summary</h2>
            <p className="text-sm text-muted-foreground">{order.order_items?.length ?? 0} item{order.order_items?.length === 1 ? "" : "s"}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(normalizedStatus)}`}>
            {statusLabel(normalizedStatus)}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-3xl border border-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{item.quantity}x {item.product_name}</p>
                {item.selected_options?.length ? <p className="text-xs text-muted-foreground">{item.selected_options.map((opt) => opt.name).join(", ")}</p> : null}
              </div>
              <strong className="text-sm text-primary">{formatCurrency((item.unit_price + item.options_total) * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-black">Total</span>
          <strong className="text-2xl text-primary">{formatCurrency(order.total)}</strong>
        </div>
        {order.notes ? (
          <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Notes</p>
            <p className="mt-1">{order.notes}</p>
          </div>
        ) : null}
      </div>

      <Button asChild variant="secondary" className="w-full">
        <Link href="/">
          <Home className="h-4 w-4" /> Back to menu
        </Link>
      </Button>
    </div>
  );
}
