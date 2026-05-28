"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Home, QrCode, Search, ShoppingBag, Sparkles, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
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
  settings
}: {
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const cart = useCart();

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
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white font-black text-primary shadow-soft sm:h-11 sm:w-11">
                A
              </div>
              <div className="min-w-0">
                <p className="hidden text-sm font-semibold opacity-85 sm:block">School-front ordering</p>
                <h1 className="truncate text-lg font-black sm:text-xl">{settings.store_name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild size="icon" variant="ghost" className="h-10 w-10 text-white hover:bg-white/15 sm:h-11 sm:w-11">
                <Link href="/admin" aria-label="Admin dashboard">
                  <UserCog className="h-5 w-5" />
                </Link>
              </Button>
              <ThemeToggle />
            </div>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 pb-4 pt-4 sm:gap-6 sm:pb-8 sm:pt-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end"
          >
            <div>
              <Badge className="bg-white/18 text-xs text-white backdrop-blur sm:text-sm">
                {settings.store_open ? "Open now" : "Closed"} · {settings.opening_time}-{settings.closing_time}
              </Badge>
              <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight tracking-normal sm:mt-4 sm:text-4xl lg:text-6xl">
                Order Ahead & Skip the Line
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/88 sm:mt-3 sm:text-base lg:text-lg">
                Fast pickup for snacks, drinks, rice meals, halo-halo, and school essentials before break time hits.
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

      <section className="sticky top-0 z-20 mx-auto max-w-6xl px-4 -mt-6 sm:-mt-8 pb-2 sm:pb-0">
        <div className="rounded-[2rem] border bg-card p-3 shadow-soft sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-muted-foreground sm:top-3.5" />
            <Input
              className="pl-11 text-base h-11 sm:h-10"
              placeholder="Search food, drinks..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4">
            <Button 
              variant={category === "all" ? "default" : "secondary"} 
              size="sm" 
              onClick={() => setCategory("all")}
              className="h-10 text-sm flex-shrink-0 sm:h-9"
            >
              All
            </Button>
            {categories.map((item) => (
              <Button
                key={item.id}
                variant={category === item.id ? "default" : "secondary"}
                size="sm"
                onClick={() => setCategory(item.id)}
                className="h-10 text-sm flex-shrink-0 sm:h-9"
              >
                {item.name}
              </Button>
            ))}
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

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/92 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          <Button variant="ghost" className="h-14 flex-col gap-1 text-xs font-semibold hover:bg-primary/10 active:bg-primary/20">
            <Home className="h-5 w-5" /> Home
          </Button>
          <Button variant="ghost" className="h-14 flex-col gap-1 text-xs font-semibold hover:bg-primary/10 active:bg-primary/20" onClick={() => cart.setDrawerOpen(true)}>
            <ShoppingBag className="h-5 w-5" /> Cart
          </Button>
          <Button asChild variant="ghost" className="h-14 flex-col gap-1 text-xs font-semibold hover:bg-primary/10 active:bg-primary/20">
            <Link href="/track/demo">
              <Clock className="h-5 w-5" /> Track
            </Link>
          </Button>
        </div>
      </nav>

      <FloatingCartButton />
      <CartDrawer settings={settings} />
    </main>
  );
}
