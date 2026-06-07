"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ClipboardList, Home, QrCode, Search, ShoppingBag, Sparkles, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { ProductCard } from "@/components/storefront/product-card";
import { FloatingCartButton } from "@/components/storefront/floating-cart-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Category, Product, StoreSettings } from "@/lib/types";
import { useCart } from "@/lib/store/cart";

export function Storefront({
  categories,
  products,
  settings,
  user
}: {
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
  user: { full_name: string; role: string; email?: string };
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const cart = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery = `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || product.category_id === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, products, query]);

  const popular = useMemo(() => {
    if (category === "all") {
      return products.filter((product) => product.is_popular).slice(0, 4);
    }
    return products.filter((product) => product.is_popular && product.category_id === category).slice(0, 4);
  }, [category, products]);

  return (
    <main className="min-h-screen pb-28">
      <section className="relative overflow-hidden bg-primary text-white">
        <Image
          src={settings.banner_url}
          alt="ARJT Store shelves"
          fill
          priority
          className="object-cover opacity-25 mix-blend-screen"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-4 pt-3 sm:pb-7 sm:pt-4">
          <nav className="relative flex items-center justify-between pb-4 sm:pb-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-[88px] w-[88px] shrink-0">
                <Image
                  src={mounted && (resolvedTheme === "dark" || theme === "dark") ? "/ARJT_LOGO_nobg.png" : "/ARJT_LOGO_WHITE.png"}
                  alt="Store logo"
                  fill
                  sizes="88px"
                  className="object-contain"
                />
              </div>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-2 text-right">
              <div className="text-xs opacity-80">
                <p>Welcome back, {user.full_name ?? user.email}</p>
                <p className="font-black capitalize">{user.role === "admin" ? "Admin" : "Customer"}</p>
              </div>
              <ThemeToggle className="text-white hover:bg-white/15" />
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex items-center gap-2">
                <Link href={"/orders" as any}>Your orders</Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex items-center gap-2">
                <Link href={{ pathname: "/profile" }}>
                  <User className="h-4 w-4" /> Profile
                </Link>
              </Button>
            </div>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 pb-4 pt-2 sm:gap-6 sm:pb-6 sm:pt-4 lg:grid-cols-[1.15fr_.85fr] lg:items-end"
          >
            <div>
              <Badge className="bg-white/18 text-xs text-white backdrop-blur sm:text-sm">
                {settings.store_open ? "Open now" : "Closed"} · {settings.opening_time}-{settings.closing_time}
              </Badge>
              <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight tracking-normal sm:mt-4 sm:text-4xl lg:text-6xl">
                Order Ahead & Skip the Line
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/88 sm:mt-3 sm:text-base lg:text-lg">
                Fast pickup for snacks, drinks, and rice meals before break time hits.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
                <Badge className="text-xs bg-white text-primary sm:text-sm">
                  <Clock className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Est. {settings.default_prep_minutes} min
                </Badge>
                <Badge className="text-xs bg-white/18 text-white backdrop-blur sm:text-sm">
                  <Sparkles className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Popular Today ready
                </Badge>
              </div>
            </div>
            <div className="hidden rounded-[2rem] border border-white/20 bg-white/16 p-4 backdrop-blur-xl lg:block">
              <div className="flex items-center gap-4">
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-3xl bg-white">
                  <QrCode className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <p className="font-bold">Scan-to-order QR</p>
                  <p className="mt-1 text-sm text-white/80">
                    Print this code at the counter so students can open the menu instantly.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="sticky top-20 z-20 mx-auto max-w-6xl px-4 -mt-6 sm:-mt-8 pb-2 sm:pb-0">
        <div className="rounded-[2rem] border bg-card/95 p-3 shadow-soft backdrop-blur-sm sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-muted-foreground sm:top-3.5" />
              <Input
                className="pl-11 text-base h-12 sm:h-11 w-full"
                placeholder="Search food, drinks..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Button
                variant={category === "all" ? "default" : "secondary"}
                size="sm"
                onClick={() => setCategory("all")}
                className="h-10 min-w-[7rem] text-sm flex-shrink-0"
              >
                All
              </Button>
              {categories.map((item) => (
                <Button
                  key={item.id}
                  variant={category === item.id ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setCategory(item.id)}
                  className="h-10 min-w-[7rem] text-sm flex-shrink-0"
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        {popular.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <div>
                <p className="text-xs font-bold text-primary sm:text-sm">Popular Today</p>
                <h2 className="text-xl font-black sm:text-2xl">Lunch-break favorites</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => cart.setDrawerOpen(true)}
                className="h-10 text-sm sm:h-9"
              >
                <ShoppingBag className="h-4 w-4" /> Cart
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              {popular.map((product) => (
                <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-xl font-black sm:mb-4 sm:text-2xl">Full Menu</h2>
          {filteredProducts.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border bg-muted/40 p-6 sm:p-8 text-center">
              <p className="font-semibold text-sm sm:text-base">No products found</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Try another category or search term.</p>
            </div>
          )}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 bg-primary text-white px-2 py-2 lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          <Button variant="ghost" className="h-14 flex-col gap-1 text-xs font-semibold text-white hover:bg-white/10 active:bg-white/20">
            <Home className="h-5 w-5" /> Home
          </Button>
          <Button variant="ghost" className="h-14 flex-col gap-1 text-xs font-semibold text-white hover:bg-white/10 active:bg-white/20" onClick={() => cart.setDrawerOpen(true)}>
            <ShoppingBag className="h-5 w-5" /> Cart
          </Button>
          <Button asChild variant="ghost" className="h-14 flex-col gap-1 text-xs font-semibold text-white hover:bg-white/10 active:bg-white/20">
            <Link href={"/orders" as any}>
              <ClipboardList className="h-5 w-5" /> Orders
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-14 flex-col gap-1 text-xs font-semibold text-white hover:bg-white/10 active:bg-white/20">
            <Link href="/profile">
              <User className="h-5 w-5" /> Profile
            </Link>
          </Button>
        </div>
      </nav>

      <FloatingCartButton />
      <CartDrawer settings={settings} />
    </main>
  );
}
