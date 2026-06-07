"use client";

import Image from "next/image";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { createOrderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StoreSettings } from "@/lib/types";
import { useCart } from "@/lib/store/cart";
import { cartItemTotal, formatCurrency } from "@/lib/utils";
import { createClient, clearSupabaseSession } from "@/lib/supabase/client";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";

export function CartDrawer({ settings }: { settings: StoreSettings }) {
  const cart = useCart();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [pending, startTransition] = useTransition();
  const [screenshotName, setScreenshotName] = useState<string>("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [recentOrderId, setRecentOrderId] = useState<string | null>(null);
  const [profileContactNumber, setProfileContactNumber] = useState<string | null>(null);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fulfillment_type: "pickup",
      desired_date: today,
      desired_time: "11:30",
      customer_name: "",
      grade_section: "",
      notes: "",
      gcash_reference: "",
      payment_screenshot_url: ""
    }
  });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function setAccountName(client: NonNullable<ReturnType<typeof createClient>>) {
      const { data, error } = await client.auth.getUser();
      const user = data.user;
      if (error || !user) {
        await clearSupabaseSession(client);
        return;
      }

      let profile: any;
      let profileError: any;

      ({ data: profile, error: profileError } = await client
        .from("users")
        .select("full_name, contact_number")
        .eq("id", user.id)
        .single());

      if (profileError?.code === "42703") {
        ({ data: profile, error: profileError } = await client
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .single());
      }

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        if (profileError.code !== "42703") {
          await clearSupabaseSession(client);
          return;
        }
      }

      const defaultName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "";
      const currentName = form.getValues("customer_name");
      if (!currentName && defaultName) {
        form.setValue("customer_name", defaultName);
      }

      setProfileContactNumber(profile?.contact_number ?? user.email ?? "");
    }

    setAccountName(supabase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fulfillment = form.watch("fulfillment_type");
  const desiredDate = form.watch("desired_date");
  const total = cart.subtotal() + (fulfillment === "delivery" ? settings.delivery_fee : 0);

  function handleScreenshotChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setScreenshotName("");
      form.setValue("payment_screenshot_url", "");
      return;
    }

    if (file.size > 1048576) {
      toast.error("Screenshot must be 1MB or less.");
      event.target.value = "";
      setScreenshotName("");
      form.setValue("payment_screenshot_url", "");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        form.setValue("payment_screenshot_url", result);
        setScreenshotName(file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  function setQuickTime(time: string) {
    form.setValue("desired_time", time);
  }

  async function handleSubmit(values: CheckoutInput) {
    startTransition(async () => {
      try {
        const result = await createOrderAction(values, cart.items);
        if (result?.orderId) {
          cart.clear();
          setRecentOrderId(result.orderId);
          setSuccessOpen(true);
          toast.success("Order placed! Admin will receive it shortly.");
          setTimeout(() => {
            setSuccessOpen(false);
            router.push(`/orders?orderId=${result.orderId}`);
          }, 1600);
        }
      } catch (error) {
        toast.error((error as Error)?.message || "Unable to place order.");
      }
    });
  }

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
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <div className="grid grid-cols-1 gap-3">
                <Input placeholder="Name" {...form.register("customer_name")} />
              </div>
              <Input placeholder="Grade/Section optional" {...form.register("grade_section")} />
              {profileContactNumber === "" ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <p className="font-semibold">Contact number required</p>
                  <p className="mt-1 text-sm text-rose-800">
                    Please add your phone number in your profile before placing an order.
                  </p>
                </div>
              ) : null}
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
              <div className="space-y-2 rounded-3xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">Delivery date</p>
                    <p className="text-sm text-muted-foreground">Default is today</p>
                  </div>
                  <span className="text-sm">{desiredDate}</span>
                </div>
                <Input type="date" min={today} {...form.register("desired_date")} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setQuickTime("08:00")}>Breakfast</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setQuickTime("11:30")}>Lunch</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setQuickTime("14:00")}>Afternoon</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setQuickTime("17:30")}>Dinner</Button>
                </div>
                <Input type="time" {...form.register("desired_time")} />
              </div>
              <Textarea placeholder="Order notes or delivery location" {...form.register("notes")} />

              <div className="rounded-3xl border bg-secondary/60 p-4">
                <p className="font-black">GCash Payment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send payment to <strong>{settings.gcash_name}</strong> · <strong>{settings.gcash_number}</strong>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Scan the QR code below or use the number above.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div className="rounded-3xl bg-white p-3 shadow-sm flex items-center justify-center">
                    <Image
                      src={settings.gcash_qr_url || "/gcash-qr.jpg"}
                      alt="GCash QR"
                      width={160}
                      height={160}
                      className="h-auto w-full rounded-2xl"
                      priority
                    />
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="Reference number (optional)" {...form.register("gcash_reference")} />
                    <div className="space-y-2 rounded-2xl border border-input bg-background p-3 text-sm">
                      <span className="font-medium">Upload payment screenshot (optional, max 1MB)</span>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 cursor-pointer">
                          Choose file
                          <Input type="file" accept="image/*" onChange={handleScreenshotChange} className="sr-only" />
                        </label>
                        <span className="truncate text-sm text-muted-foreground">{screenshotName || "No file chosen"}</span>
                      </div>
                    </div>
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

              <Button disabled={pending || profileContactNumber == null || profileContactNumber === ""} className="h-13 w-full text-base">
                {pending ? "Submitting..." : "Place Order"}
              </Button>
            </form>
          ) : null}
        </div>
      </DialogContent>

      {successOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md rounded-3xl border border-white/10 bg-background p-6 shadow-soft">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-black">Thank you for ordering!</h2>
            </div>
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Your order is on its way to the admin for processing.</p>
              <Button
                className="w-full"
                onClick={() => {
                  setSuccessOpen(false);
                  if (recentOrderId) router.push(`/orders?orderId=${recentOrderId}`);
                }}
              >
                Go to order status
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
