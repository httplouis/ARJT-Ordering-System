import { analytics, categories, orders, products, settings } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";
import type { Analytics, Order, Product, StoreSettings } from "@/lib/types";

const localProductImages: Record<string, string> = {
  "tapsilog-beef": "/products/tapsilog.webp",
  tocilog: "/products/tocilog.webp",
  porksilog: "/products/porksilog.webp",
  sisilog: "/products/sisilog.webp",
  bangsilog: "/products/bangsilog.webp",
  chicksilog: "/products/chicksilog.webp",
  hotsilog: "/products/hotsilog.webp",
  "hotdog-with-rice": "/products/hotdog-withrice.jfif",
  "siomai-with-rice": "/products/siomai-with-rice.webp",
  "rice-with-egg": "/products/rice-with-egg.webp",
  "chicken-fillet": "/products/chicken-fillet.webp",
  "chicken-dumpling-with-rice": "/products/chicken-dumplings.webp",
  "chicken-nuggets-with-rice": "/products/chicken-nuggets-wrice.webp",
  "mango-shake": "/products/mango-shake.jpg",
  "strawberry-shake": "/products/strawberry-shake.jpg",
  "buko-shake": "/products/buko-shake.jpg",
  "melon-shake": "/products/melon-shake.jpg",
  "halo-halo-shake": "/products/halo-halo.jpg",
  "mais-con-yelo": "/products/mais-con-yelo.webp",
  "strawberry-soda": "/products/strawberry-soda.jpg",
  "kiwi-soda": "/products/kiwi-soda.jpg",
  "green-apple-soda": "/products/green-apple-soda.jpg",
  "lychee-soda": "/products/lychee-soda.jpg",
  fries: "/products/fries.jpg",
  "fish-tofu": "/products/fish-tofu.webp",
  squidballs: "/products/squidball.webp",
  "kwek-kwek": "/products/kwek-kwek.webp",
  fishball: "/products/fishball.webp",
  "hotdog-on-stick": "/products/hotdog-on-stick.jpg",
  "siomai-pork": "/products/siomai-pork.webp",
  "siomai-beef": "/products/siomai-beef.webp",
  "siomai-japanese": "/products/japanese-siomai.webp",
  kikiam: "/products/kikiam.webp",
  dynamite: "/products/dynamite.jpg",
  "regular-burger": "/products/regular-burger-cheese.jpeg",
  "burger-with-cheese": "/products/regular-burger-cheese.jpeg",
  "hotdog-burger": "/products/hotdog-sandwich.jpg"
};

const localProductNames: Record<string, string> = {
  "fish-tofu": "Fish Tofu",
  "hotdog-on-stick": "Hotdog on Stick",
  "kwek-kwek": "Kwek-Kwek"
};

function normalizeProductSlug(slug: string | null | undefined, fallbackName?: string) {
  const source = slug ?? fallbackName ?? "";
  return source
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function applyLocalProductImages(productsToPatch: Product[]) {
  return productsToPatch.map((product) => {
    const normalizedSlug = normalizeProductSlug(product.slug, product.name);
    const localImage = localProductImages[normalizedSlug];

    return {
      ...product,
      name: localProductNames[normalizedSlug] ?? product.name,
      image_url: localImage ?? product.image_url
    };
  });
}

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

  const hiddenCategorySlugs = new Set(["halo-halo", "school-essentials", "meals"]);
  const storefrontCategories = (categoryResult.data ?? categories).filter((category) => !hiddenCategorySlugs.has(category.slug));

  return {
    categories: storefrontCategories,
    products: applyLocalProductImages((productResult.data as Product[] | null) ?? products),
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
    products: applyLocalProductImages(liveProducts),
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
