"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Volume2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { deleteOrderAction, updateOrderStatusAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/types";
import { cn, formatCurrency, statusLabel, statusTone } from "@/lib/utils";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

export function LiveOrders({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<OrderStatus | "all">("all");
  const audioRef = useRef<HTMLAudioElement>(null);

  const filtered = useMemo(
    () =>
      orders
        .filter((order) =>
          `${order.customer_name} ${order.queue_number} ${order.contact_number} ${order.notes ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
        .filter((order) => historyStatus === "all" || order.status === historyStatus),
    [orders, query, historyStatus]
  );

  const newOrders = filtered.filter((o) => o.status === "pending");
  const inProgressOrders = filtered.filter((o) => ["confirmed", "preparing", "ready_for_pickup", "out_for_delivery"].includes(o.status));
  const historyOrders = filtered.filter((o) => ["completed", "cancelled", "out_of_stock"].includes(o.status));
  const filteredHistoryOrders = historyOrders.filter((o) => historyStatus === "all" || o.status === historyStatus);

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
        if (payload.eventType === "DELETE") {
          setOrders((current) => current.filter((order) => order.id !== payload.old.id));
        }
      })
      .subscribe();

    const interval = setInterval(async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*), payments(*)").order("created_at", { ascending: false });
      if (!error && data) {
        setOrders(data as Order[]);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAcknowledge = () => {
    return;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Live Order Queue</CardTitle>
            <p className="text-xs text-muted-foreground">
              {newOrders.length > 0 && `${newOrders.length} new order${newOrders.length > 1 ? "s" : ""} waiting`}
            </p>
          </div>
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search queue..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <audio ref={audioRef} src="/notify.mp3" preload="auto" />

        {/* History Filter Panel */}
        <div className="rounded-3xl border border-muted/20 bg-muted/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Order history</p>
              <p className="text-sm font-semibold">Filter by status</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "completed", "cancelled", "out_of_stock"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={historyStatus === status ? "secondary" : "outline"}
                  className="text-xs"
                  onClick={() => setHistoryStatus(status)}
                >
                  {status === "all" ? "All" : status === "out_of_stock" ? "Out of stock" : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* New Orders Section */}
        {newOrders.length > 0 && (
          <div className="space-y-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="font-semibold text-primary">New Orders ({newOrders.length})</p>
            </div>
            {newOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isNew
                onDelete={() => setOrders((current) => current.filter((item) => item.id !== order.id))}
                onStatusUpdate={(orderId, status) =>
                  setOrders((current) => current.map((item) => (item.id === orderId ? { ...item, status } : item)))
                }
              />
            ))}
          </div>
        )}

        {/* In Progress Orders Section */}
        <div className="space-y-3">
          {newOrders.length > 0 && <p className="text-xs font-semibold text-muted-foreground mt-4">Other Orders</p>}
          {inProgressOrders.length > 0 ? (
            inProgressOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isNew={false}
                onDelete={() => setOrders((current) => current.filter((item) => item.id !== order.id))}
                onStatusUpdate={(orderId, status) =>
                  setOrders((current) => current.map((item) => (item.id === orderId ? { ...item, status } : item)))
                }
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No in-progress orders.</p>
          )}
        </div>

        {historyOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground mt-4">Order history</p>
              <p className="text-xs text-muted-foreground">
                {filteredHistoryOrders.length} item{filteredHistoryOrders.length !== 1 ? "s" : ""} shown
              </p>
            </div>
            {filteredHistoryOrders.length > 0 ? (
              filteredHistoryOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={false}
                  onDelete={() => setOrders((current) => current.filter((item) => item.id !== order.id))}
                  onStatusUpdate={(orderId, status) =>
                    setOrders((current) => current.map((item) => (item.id === orderId ? { ...item, status } : item)))
                  }
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No history orders match this filter.</p>
            )}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
            <p className="font-semibold">No orders in this view</p>
            <p className="text-xs mt-1">New orders will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderCard({
  order,
  isNew,
  onDelete,
  onStatusUpdate
}: {
  order: Order;
  isNew: boolean;
  onDelete: () => void;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteOrderAction(order.id);
      onDelete();
      toast.success("Order deleted");
    } catch (error) {
      toast.error("Unable to delete order");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleStatusChange = async (status: OrderStatus, successMessage: string) => {
    setIsUpdating(true);
    try {
      await updateOrderStatusAction(order.id, status);
      onStatusUpdate(order.id, status);
      toast.success(successMessage);
    } catch (error) {
      toast.error("Unable to update order status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    setCancelConfirmOpen(false);
    await handleStatusChange("cancelled", "Order cancelled");
  };

  return (
    <div className={`w-full max-w-full overflow-hidden rounded-3xl border p-4 transition-all shadow-sm ${isNew ? "bg-primary/5 border-primary/30" : "bg-background"}`}>
      <div className="flex flex-col gap-4 sm:gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-black">#{order.queue_number}</p>
              <Badge className={cn("text-xs", statusTone(order.status))}>
                {statusLabel(order.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{formatDateTime(order.created_at)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {order.status === "pending" ? (
              <Button
                size="sm"
                onClick={async () => {
                  await handleStatusChange("preparing", "Order moved to preparing");
                }}
                className="text-xs self-start sm:self-center"
                disabled={isUpdating}
              >
                Start preparing
              </Button>
            ) : null}

            {order.status !== "completed" && order.status !== "cancelled" ? (
              <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="text-xs self-start sm:self-center" disabled={isUpdating}>
                    Cancel order
                  </Button>
                </DialogTrigger>
                <DialogContent className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="max-w-md rounded-3xl bg-background shadow-xl border">
                    <DialogHeader className="border-b px-5 py-4">
                      <DialogTitle className="text-lg font-bold">Cancel order?</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">Are you sure you want to cancel this order?</p>
                    </DialogHeader>
                    <div className="p-5 space-y-4">
                      <div className="rounded-2xl bg-muted/50 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Order</p>
                        <p className="font-semibold">#{order.queue_number} • {order.customer_name}</p>
                        {order.grade_section ? <p className="text-xs text-muted-foreground mt-1">{order.grade_section}</p> : null}
                      </div>
                      <DialogFooter className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="outline" size="sm" className="text-xs">
                            No, keep order
                          </Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                          onClick={handleCancelOrder}
                          disabled={isUpdating}
                        >
                          {isUpdating ? "Cancelling..." : "Yes, cancel order"}
                        </Button>
                      </DialogFooter>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-muted/30 bg-muted/50 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
              <p className="font-semibold truncate">{order.customer_name}</p>
              {order.grade_section ? <p className="text-xs text-muted-foreground">{order.grade_section}</p> : null}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"}</p>
              <p className="font-semibold">{new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date(order.desired_time))}</p>
            </div>
          </div>
          {order.estimated_ready_at ? (
            <p className="mt-3 text-xs text-primary">Est. ready: {formatDateTime(order.estimated_ready_at)}</p>
          ) : null}
        </div>
      </div>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-left text-xs font-semibold text-primary hover:text-primary/80 mt-3 mb-3 transition-colors"
      >
        {showDetails ? "▼ Hide details" : "▶ Show details"}
      </button>

      {showDetails && (
        <div className="space-y-4 border-t pt-4">
          {/* Order Items */}
          <div>
            <p className="font-semibold text-sm mb-3">Items</p>
            <div className="space-y-3">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-3xl border border-muted/30 bg-muted/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.quantity}x {item.product_name}</p>
                    {item.selected_options?.length ? (
                      <p className="text-xs text-muted-foreground truncate">Options: {item.selected_options.map((opt) => opt.name).join(", ")}</p>
                    ) : null}
                    {item.note ? <p className="text-xs italic text-muted-foreground">Note: {item.note}</p> : null}
                  </div>
                  <strong className="text-sm text-primary">{formatCurrency((item.unit_price + item.options_total) * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-3xl border border-muted/30 bg-muted/50 p-4 text-sm">
            <p className="font-semibold mb-3">Payment</p>
            <div className="space-y-2 text-sm">
              <p>Amount: <strong>{formatCurrency(order.total)}</strong></p>
              <p>Status: {order.payments?.[0]?.status ?? "pending_verification"}</p>
              {order.payments?.[0]?.gcash_reference && <p>Ref: {order.payments[0].gcash_reference}</p>}
            </div>
            {order.payments?.[0]?.screenshot_url && (
              <Dialog>
                <div className="mt-2">
                  <DialogTrigger asChild>
                    <button className="group w-full overflow-hidden rounded-xl border bg-muted/50 transition hover:border-primary">
                      <img
                        src={order.payments[0].screenshot_url}
                        alt="Payment proof thumbnail"
                        className="h-36 w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                      <div className="border-t px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                        Click to view full image
                      </div>
                    </button>
                  </DialogTrigger>

                  <DialogContent className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-background shadow-xl">
                      <DialogHeader className="flex items-center justify-between border-b px-5 py-4">
                        <DialogTitle className="text-lg font-bold">Payment proof</DialogTitle>
                        <DialogClose className="rounded-lg border border-muted px-3 py-1 text-sm transition hover:bg-muted">Close</DialogClose>
                      </DialogHeader>
                      <div className="p-4">
                        <img
                          src={order.payments[0].screenshot_url}
                          alt="Payment proof full"
                          className="w-full h-auto max-h-[80vh] object-contain"
                        />
                      </div>
                    </div>
                  </DialogContent>
                </div>
              </Dialog>
            )}
          </div>

          {/* Customer Notes */}
          {order.notes && (
            <div className="rounded-3xl border border-amber-200/50 bg-amber-50/70 p-4 text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Customer Notes</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{order.notes}</p>
            </div>
          )}

          {/* Status Controls */}
          <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:flex-wrap sm:items-center">
            {order.status === "pending" ? (
              <Button
                size="sm"
                onClick={async () => {
                  await handleStatusChange("preparing", "Order moved to preparing");
                }}
                className="text-xs"
                disabled={isUpdating}
              >
                Start preparing
              </Button>
            ) : order.status === "preparing" ? (
              <Button
                size="sm"
                onClick={async () => {
                  await handleStatusChange("completed", "Order marked complete");
                }}
                className="text-xs"
                disabled={isUpdating}
              >
                Mark complete
              </Button>
            ) : (
              <Badge className={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
            )}

            {order.status !== "completed" && order.status !== "cancelled" ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await handleStatusChange("cancelled", "Order cancelled");
                }}
                className="text-xs"
                disabled={isUpdating}
              >
                Cancel order
              </Button>
            ) : null}

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="text-xs">
                  Delete order
                </Button>
              </DialogTrigger>
              <DialogContent className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="max-w-md rounded-3xl bg-background shadow-xl border">
                  <DialogHeader className="border-b px-5 py-4">
                    <DialogTitle className="text-lg font-bold">Delete order?</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">Are you sure you want to delete this order?</p>
                  </DialogHeader>
                  <div className="p-5 space-y-4">
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Order</p>
                      <p className="font-semibold">#{order.queue_number} • {order.customer_name}</p>
                      {order.grade_section ? <p className="text-xs text-muted-foreground mt-1">{order.grade_section}</p> : null}
                    </div>
                    <DialogFooter className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button variant="outline" size="sm" className="text-xs">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Yes, delete"}
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}

