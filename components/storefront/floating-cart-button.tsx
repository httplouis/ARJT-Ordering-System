"use client";

import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils";

export function FloatingCartButton() {
  const cart = useCart();
  const count = cart.count();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !count) return null;

  return (
    <Button
      className="fixed bottom-20 right-3 z-40 h-14 rounded-full px-4 shadow-lg font-semibold text-sm lg:bottom-6 lg:right-4 sm:px-5 active:scale-95 transition-transform"
      onClick={() => cart.setDrawerOpen(true)}
    >
      <ShoppingBag className="h-5 w-5" />
      <span className="ml-2 hidden sm:inline">{count} ·</span> {formatCurrency(cart.subtotal())}
    </Button>
  );
}
