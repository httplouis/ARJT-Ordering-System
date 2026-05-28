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

const steps: OrderStatus[] = ["pending", "confirmed", "preparing", "ready_for_pickup", "completed"];

export function OrderTracker({ order: initialOrder }: { order: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const activeIndex = Math.max(0, steps.indexOf(order.status));
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
    <main className="min-h-screen bg-muted/35 p-4">
      <section className="mx-auto max-w-lg space-y-5">
        <div className="rounded-[2rem] bg-primary p-6 text-white shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Queue number</p>
              <h1 className="text-5xl font-black">#{order.queue_number}</h1>
            </div>
            <PackageCheck className="h-14 w-14 opacity-80" />
          </div>
          <Badge className="mt-5 bg-white text-primary">{statusLabel(order.status)}</Badge>
        </div>

        <div className="rounded-[2rem] border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
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
                <div key={step} className="flex gap-3">
                  <motion.div
                    animate={{ scale: active ? 1 : 0.88 }}
                    className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${
                      active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
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
          <div className="flex items-center justify-between">
            <h2 className="font-black">Order Summary</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(order.status)}`}>
              {statusLabel(order.status)}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.product_name}
                </span>
                <strong>{formatCurrency((item.unit_price + item.options_total) * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t pt-4 text-lg">
            <span className="font-black">Total</span>
            <strong className="text-primary">{formatCurrency(order.total)}</strong>
          </div>
        </div>

        <Button asChild variant="secondary" className="w-full">
          <Link href="/">
            <Home className="h-4 w-4" /> Back to menu
          </Link>
        </Button>
      </section>
    </main>
  );
}
