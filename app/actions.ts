"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { checkoutSchema, productSchema, settingsSchema, profileSchema } from "@/lib/validations";
import type { CartItem, OrderStatus } from "@/lib/types";
import { cartItemTotal, formatCurrency, makeQueueNumber } from "@/lib/utils";

async function sendSms(to: string | undefined, body: string) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from || !to) return;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams();
    params.append("To", to);
    params.append("From", from);
    params.append("Body", body);

    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
  } catch (err) {
    // Do not block order creation on SMS failures
    // eslint-disable-next-line no-console
    console.error("SMS send failed", err);
  }
}

async function sendTelegram(chatId: string | undefined, text: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const trimmedChatId = chatId?.trim();
    if (!token) {
      // eslint-disable-next-line no-console
      console.error("Telegram send failed: missing bot token");
      return;
    }
    if (!trimmedChatId) {
      // eslint-disable-next-line no-console
      console.error("Telegram send failed: missing admin chat id");
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
      chat_id: Number.isNaN(Number(trimmedChatId)) ? trimmedChatId : Number(trimmedChatId),
      text,
      disable_notification: false
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const body = await res.text();
      // eslint-disable-next-line no-console
      console.error("Telegram send failed", res.status, body, { chatId: trimmedChatId });
    }
  } catch (err) {
    // don't block order creation on Telegram failures
    // eslint-disable-next-line no-console
    console.error("Telegram send failed", err);
  }
}

export async function createOrderAction(payload: unknown, cart: CartItem[]) {
  const input = checkoutSchema.parse(payload);
  const subtotal = cart.reduce((sum, item) => sum + cartItemTotal(item), 0);
  const deliveryFee = input.fulfillment_type === "delivery" ? 10 : 0;
  const total = subtotal + deliveryFee;
  const authClient = await createClient();
  const { data: userData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
  const user = userData?.user;

  if (!user) {
    throw new Error("You must be logged in to place an order.");
  }

  const supabase = createAdminClient();
  const queueNumber = makeQueueNumber();
  const desiredTime = input.desired_time.includes("T")
    ? input.desired_time
    : `${input.desired_date}T${input.desired_time}:00`;

  if (!supabase) {
    redirect(`/orders?orderId=demo-${queueNumber}`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, contact_number")
    .eq("id", user.id)
    .single();

  const contactNumber = profile?.contact_number?.trim() ?? "";
  if (!contactNumber) {
    throw new Error("Please add your contact number in your profile before placing an order.");
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      queue_number: queueNumber,
      customer_name: input.customer_name || profile?.full_name || user.user_metadata?.full_name || user.email || "Customer",
      contact_number: contactNumber,
      grade_section: input.grade_section,
      fulfillment_type: input.fulfillment_type,
      desired_time: desiredTime,
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

  // send SMS to admin if configured (won't block order creation)
  try {
    const adminPhone = process.env.ADMIN_PHONE;
    const smsBody = `New order received — Queue #${queueNumber} from ${input.customer_name || "Customer"}. Total ${total}`;
    await sendSms(adminPhone, smsBody);
  } catch (e) {
    // ignore
  }

  // send Telegram message to admin if configured (won't block order creation)
  try {
    const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    const orderDate = new Date(desiredTime);
    const formattedTime = isNaN(orderDate.getTime())
      ? desiredTime
      : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(orderDate);
    const timeLabel = input.fulfillment_type === "delivery" ? "Delivery time" : "Pickup time";
    const itemsText = cart
      .map((item) => {
        const itemTotal = (item.product.price + item.selectedOptions.reduce((sum, option) => sum + option.price, 0)) * item.quantity;
        return `• ${item.quantity}x ${item.product.name} • ${formatCurrency(itemTotal)}`;
      })
      .join("\n");
    const notesText = input.notes ? `\nNotes: ${input.notes}` : "";
    const sectionText = input.grade_section ? `\nSection: ${input.grade_section}` : "";
    const tgText = `New order received — Queue #${queueNumber}\nFrom: ${input.customer_name || "Customer"}${sectionText}\n${timeLabel}: ${formattedTime}\nItems:\n${itemsText}\nTotal: ${formatCurrency(total)}${notesText}`;
    await sendTelegram(adminChat, tgText);
  } catch (e) {
    console.error("Telegram send failed", e);
  }

  revalidatePath("/");
  return { orderId: order.id };
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const supabase = createAdminClient();

  if (!supabase) {
    revalidatePath("/admin");
    return;
  }

  await supabase.from("orders").update({ status }).eq("id", orderId);

  const notificationBody =
    status === "cancelled"
      ? `Order ${orderId} has been cancelled.`
      : `Order ${orderId} is now ${status}`;

  await supabase.from("notifications").insert({
    title: status === "cancelled" ? "Order cancelled" : "Order updated",
    body: notificationBody,
    type: "order_status",
    order_id: orderId
  });

  revalidatePath("/admin");
  revalidatePath(`/orders`);
}

export async function deleteOrderAction(orderId: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    revalidatePath("/admin");
    return;
  }

  await supabase.from("orders").delete().eq("id", orderId);
  await supabase.from("notifications").insert({
    title: "Order deleted",
    body: `Order ${orderId} was removed by an admin`,
    type: "order_deleted",
    order_id: orderId
  });

  revalidatePath("/admin");
  revalidatePath(`/orders`);
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

export async function updateProfileAction(payload: unknown) {
  const input = profileSchema.parse(payload);
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const {
    data: userData,
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/login");
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    throw new Error("Unable to update profile");
  }

  const { error } = await adminSupabase
    .from("users")
    .update({ full_name: input.full_name, contact_number: input.contact_number })
    .eq("id", userData.user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/profile");
  revalidatePath("/");

  return { success: true };
}
