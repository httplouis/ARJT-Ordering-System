"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { checkoutSchema, productSchema, settingsSchema } from "@/lib/validations";
import type { CartItem, OrderStatus } from "@/lib/types";
import { cartItemTotal, makeQueueNumber } from "@/lib/utils";

export async function createOrderAction(payload: unknown, cart: CartItem[]) {
  const input = checkoutSchema.parse(payload);
  const subtotal = cart.reduce((sum, item) => sum + cartItemTotal(item), 0);
  const deliveryFee = input.fulfillment_type === "delivery" ? 10 : 0;
  const total = subtotal + deliveryFee;
  const supabase = createAdminClient();
  const queueNumber = makeQueueNumber();

  if (!supabase) {
    redirect(`/track/demo-${queueNumber}`);
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      queue_number: queueNumber,
      customer_name: input.customer_name,
      contact_number: input.contact_number,
      grade_section: input.grade_section,
      fulfillment_type: input.fulfillment_type,
      desired_time: input.desired_time,
      notes: input.notes,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      estimated_ready_at: new Date(Date.now() + 12 * 60000).toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const orderItems = cart.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    product_name: item.product.name,
    quantity: item.quantity,
    unit_price: item.product.price,
    options_total: item.selectedOptions.reduce((sum, option) => sum + option.price, 0),
    selected_options: item.selectedOptions,
    note: item.note
  }));

  await supabase.from("order_items").insert(orderItems);
  await supabase.from("payments").insert({
    order_id: order.id,
    amount: total,
    gcash_reference: input.gcash_reference,
    screenshot_url: input.payment_screenshot_url,
    status: "pending_verification"
  });

  await supabase.from("notifications").insert({
    title: "New order",
    body: `Queue #${queueNumber} from ${input.customer_name}`,
    type: "order_created",
    order_id: order.id
  });

  revalidatePath("/");
  redirect(`/track/${order.id}`);
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const supabase = createAdminClient();

  if (!supabase) {
    revalidatePath("/admin");
    return;
  }

  await supabase.from("orders").update({ status }).eq("id", orderId);
  await supabase.from("notifications").insert({
    title: "Order updated",
    body: `Order ${orderId} is now ${status}`,
    type: "order_status",
    order_id: orderId
  });

  revalidatePath("/admin");
  revalidatePath(`/track/${orderId}`);
}

export async function upsertProductAction(payload: unknown, id?: string) {
  const input = productSchema.parse(payload);
  const supabase = createAdminClient();
  if (!supabase) return;

  const row = { ...input, slug: input.name.toLowerCase().replaceAll(" ", "-") };
  if (id) {
    await supabase.from("products").update(row).eq("id", id);
  } else {
    await supabase.from("products").insert(row);
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function updateSettingsAction(payload: unknown) {
  const input = settingsSchema.parse(payload);
  const supabase = createAdminClient();
  if (!supabase) return;

  await supabase.from("settings").upsert({ id: 1, ...input });
  revalidatePath("/admin/settings");
  revalidatePath("/");
}
