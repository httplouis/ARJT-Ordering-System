"use client";

import Image from "next/image";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";
import { createOrderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StoreSettings } from "@/lib/types";
import { useCart } from "@/lib/store/cart";
import { cartItemTotal, formatCurrency } from "@/lib/utils";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";

export function CartDrawer({ settings }: { settings: StoreSettings }) {
  const cart = useCart();
  const [pending, startTransition] = useTransition();
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fulfillment_type: "pickup",
      desired_time: "",
      customer_name: "",
      contact_number: "",
      grade_section: "",
      notes: "",
      gcash_reference: "",
      payment_screenshot_url: ""
    }
  });
  const fulfillment = form.watch("fulfillment_type");
  const total = cart.subtotal() + (fulfillment === "delivery" ? settings.delivery_fee : 0);

  return (
    <Dialog open={cart.drawerOpen} onOpenChange={cart.setDrawerOpen}>
      <DialogContent className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[2rem] border bg-background p-0 shadow-soft sm:left-auto sm:right-4 sm:top-4 sm:h-[calc(100vh-2rem)] sm:w-[440px] sm:rounded-[2rem]">
        <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b bg-background/95 p-5 backdrop-blur">
          <DialogTitle className="text-xl font-black">Your Order</DialogTitle>
          <Button size="icon" variant="ghost" onClick={() => cart.setDrawerOpen(false)} aria-label="Close cart">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {cart.items.length ? (
            cart.items.map((item) => (
              <div key={item.product.id} className="rounded-3xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(cartItemTotal(item))}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => cart.removeItem(item.product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="icon" variant="secondary" onClick={() => cart.updateQuantity(item.product.id, item.quantity - 1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center font-black">{item.quantity}</span>
                  <Button size="icon" variant="secondary" onClick={() => cart.updateQuantity(item.product.id, item.quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  className="mt-3"
                  placeholder="Item note"
                  value={item.note ?? ""}
                  onChange={(event) => cart.updateNote(item.product.id, event.target.value)}
                />
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed p-8 text-center">
              <p className="font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Add lunch-break favorites from the menu.</p>
            </div>
          )}

          {cart.items.length ? (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                startTransition(async () => {
                  toast.success("Order sent. Preparing your tracker...");
                  await createOrderAction(values, cart.items);
                  cart.clear();
                });
              })}
            >
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Name" {...form.register("customer_name")} />
                <Input placeholder="Contact number" {...form.register("contact_number")} />
              </div>
              <Input placeholder="Grade/Section optional" {...form.register("grade_section")} />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={fulfillment === "pickup" ? "default" : "secondary"}
                  onClick={() => form.setValue("fulfillment_type", "pickup")}
                >
                  Pickup
                </Button>
                <Button
                  type="button"
                  variant={fulfillment === "delivery" ? "default" : "secondary"}
                  onClick={() => form.setValue("fulfillment_type", "delivery")}
                >
                  Delivery
                </Button>
              </div>
              <Input type="datetime-local" {...form.register("desired_time")} />
              <Textarea placeholder="Order notes or delivery location" {...form.register("notes")} />

              <div className="rounded-3xl border bg-secondary/60 p-4">
                <p className="font-black">GCash Payment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send payment to <strong>{settings.gcash_name}</strong> · <strong>{settings.gcash_number}</strong>
                </p>
                <div className="mt-3 grid grid-cols-[96px_1fr] gap-3">
                  <Image src={settings.gcash_qr_url} alt="GCash QR" width={96} height={96} className="rounded-2xl bg-white p-2" />
                  <div className="space-y-2">
                    <Input placeholder="Reference number" {...form.register("gcash_reference")} />
                    <Input 
                      type="file" 
                      accept="image/*"
                      placeholder="Upload payment screenshot" 
                      {...form.register("payment_screenshot_url")} 
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(cart.subtotal())}</strong>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Delivery fee</span>
                  <strong>{formatCurrency(fulfillment === "delivery" ? settings.delivery_fee : 0)}</strong>
                </div>
                <div className="mt-3 flex justify-between text-lg">
                  <span className="font-black">Total</span>
                  <strong className="text-primary">{formatCurrency(total)}</strong>
                </div>
              </div>

              <Button disabled={pending} className="h-13 w-full text-base">
                {pending ? "Submitting..." : "Place Order"}
              </Button>
            </form>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
