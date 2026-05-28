"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { upsertProductAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Category, Product } from "@/lib/types";
import { productSchema } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";

export function ProductManager({ products, categories }: { products: Product[]; categories: Category[] }) {
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category_id: categories[0]?.id ?? "",
      image_url: "",
      prep_time_minutes: 8,
      is_available: true,
      is_popular: false
    }
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit(async (values) => {
              await upsertProductAction(values);
              form.reset();
              toast.success("Product saved");
            })}
          >
            <Input placeholder="Product name" {...form.register("name")} />
            <Input placeholder="Description" {...form.register("description")} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Price" {...form.register("price")} />
              <Input type="number" placeholder="Prep minutes" {...form.register("prep_time_minutes")} />
            </div>
            <select className="h-11 w-full rounded-2xl border bg-background px-4 text-sm" {...form.register("category_id")}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <Input placeholder="Image URL or Supabase Storage URL" {...form.register("image_url")} />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" {...form.register("is_available")} /> Available
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" {...form.register("is_popular")} /> Popular
            </label>
            <Button className="w-full">
              <PackagePlus className="h-4 w-4" /> Save Product
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="rounded-3xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{product.name}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                </div>
                <strong className="text-primary">{formatCurrency(product.price)}</strong>
              </div>
              <div className="mt-3 flex gap-2 text-xs font-bold">
                <span className="rounded-full bg-muted px-2 py-1">{product.is_available ? "Available" : "Hidden"}</span>
                {product.is_popular ? <span className="rounded-full bg-secondary px-2 py-1">Popular</span> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
