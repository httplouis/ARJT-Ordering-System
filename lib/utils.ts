import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CartItem, OrderStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(value);
}

export function cartItemTotal(item: CartItem) {
  const optionsTotal = item.selectedOptions.reduce((sum, option) => sum + option.price, 0);
  return (item.product.price + optionsTotal) * item.quantity;
}

export function makeQueueNumber() {
  return Math.floor(100 + Math.random() * 900);
}

export function statusLabel(status: OrderStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusTone(status: OrderStatus) {
  const tones: Record<OrderStatus, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200",
    preparing: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
    ready_for_pickup: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
    out_for_delivery: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200",
    cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
  };
  return tones[status];
}
