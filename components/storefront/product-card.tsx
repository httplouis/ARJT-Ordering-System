"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils";

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const cart = useCart();

  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="h-full overflow-hidden flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
          <div className="absolute left-2 top-2 flex gap-2 sm:left-3 sm:top-3">
            {product.is_popular ? <Badge className="bg-primary text-white text-xs">Popular</Badge> : null}
            {!product.is_available ? <Badge className="bg-muted text-muted-foreground text-xs">Unavailable</Badge> : null}
          </div>
        </div>
        <div className="flex-1 space-y-2 p-3 sm:space-y-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-sm sm:text-base line-clamp-2">{product.name}</h3>
              {!compact ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{product.description}</p> : null}
            </div>
            <p className="font-black text-primary text-sm sm:text-base flex-shrink-0">{formatCurrency(product.price)}</p>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground flex-shrink-0">
              <Clock className="h-3.5 w-3.5" /> {product.prep_time_minutes}m
            </span>
            <Button
              size="sm"
              disabled={!product.is_available}
              onClick={() => {
                cart.addItem(product);
                toast.success(`${product.name} added`);
              }}
              className="h-9 text-xs sm:h-10 sm:text-sm"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
