import { analytics, categories, orders, products, settings } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";
import type { Analytics, Order, Product, StoreSettings } from "@/lib/types";

export async function getStorefrontData() {
  const supabase = await createClient();

  if (!supabase) {
    return { categories, products, settings };
  }

  const [categoryResult, productResult, settingsResult] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*, category:categories(*)").order("is_popular", { ascending: false }),
    supabase.from("settings").select("*").single()
  ]);

  return {
    categories: categoryResult.data ?? categories,
    products: (productResult.data as Product[] | null) ?? products,
    settings: (settingsResult.data as StoreSettings | null) ?? settings
  };
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const supabase = await createClient();

  if (!supabase) {
    return orders.find((order) => order.id === orderId) ?? null;
  }

  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(*)")
    .eq("id", orderId)
    .single();

  return (data as Order | null) ?? null;
}

export async function getAdminData(): Promise<{
  analytics: Analytics;
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
}> {
  const supabase = await createClient();

  if (!supabase) {
    return { analytics, orders, products, settings };
  }

  const [orderResult, productResult, settingsResult] = await Promise.all([
    supabase.from("orders").select("*, order_items(*), payments(*)").order("created_at", { ascending: false }),
    supabase.from("products").select("*, category:categories(*)").order("created_at", { ascending: false }),
    supabase.from("settings").select("*").single()
  ]);

  const liveOrders = (orderResult.data as Order[] | null) ?? orders;
  const liveProducts = (productResult.data as Product[] | null) ?? products;
  const liveSettings = (settingsResult.data as StoreSettings | null) ?? settings;

  return {
    analytics: makeAnalytics(liveOrders),
    orders: liveOrders,
    products: liveProducts,
    settings: liveSettings
  };
}

function makeAnalytics(items: Order[]): Analytics {
  const completed = items.filter((order) => order.status === "completed");
  const revenueToday = items.reduce((sum, order) => sum + order.total, 0);
  const counts = new Map<string, number>();

  items.forEach((order) => {
    order.order_items?.forEach((item) => counts.set(item.product_name, (counts.get(item.product_name) ?? 0) + item.quantity));
  });

  const bestSellers = Array.from(counts.entries())
    .map(([name, sold]) => ({ name, sold }))
    .sort((a, b) => b.sold - a.sold);

  return {
    ...analytics,
    ordersToday: items.length,
    revenueToday,
    pendingOrders: items.filter((order) => ["pending", "confirmed", "preparing"].includes(order.status)).length,
    completedOrders: completed.length,
    mostOrderedProduct: bestSellers[0]?.name ?? "No orders yet",
    bestSellers: bestSellers.length ? bestSellers : analytics.bestSellers
  };
}
