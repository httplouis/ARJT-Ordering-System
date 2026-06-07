"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, Product, ProductOption } from "@/lib/types";
import { cartItemTotal } from "@/lib/utils";

const CART_STORAGE_KEY = "arjt-cart";
const CART_USER_KEY = "arjt-user-id";

const cartStorage = createJSONStorage(() => ({
  getItem(name: string) {
    if (typeof window === "undefined") return null;
    const userId = window.localStorage.getItem(CART_USER_KEY);
    return window.localStorage.getItem(`${name}-${userId ?? "guest"}`);
  },
  setItem(name: string, value: string) {
    if (typeof window === "undefined") return null;
    const userId = window.localStorage.getItem(CART_USER_KEY);
    return window.localStorage.setItem(`${name}-${userId ?? "guest"}`, value);
  },
  removeItem(name: string) {
    if (typeof window === "undefined") return null;
    const userId = window.localStorage.getItem(CART_USER_KEY);
    return window.localStorage.removeItem(`${name}-${userId ?? "guest"}`);
  }
}));

type CartState = {
  items: CartItem[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, selectedOptions?: ProductOption[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNote: (productId: string, note: string) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      addItem: (product, selectedOptions = []) =>
        set((state) => {
          const existing = state.items.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              )
            };
          }
          return { items: [...state.items, { product, quantity: 1, selectedOptions }] };
        }),
      removeItem: (productId) => set((state) => ({ items: state.items.filter((item) => item.product.id !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) => (item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
            .filter((item) => item.quantity > 0)
        })),
      updateNote: (productId, note) =>
        set((state) => ({
          items: state.items.map((item) => (item.product.id === productId ? { ...item, note } : item))
        })),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, item) => sum + cartItemTotal(item), 0),
      count: () => get().items.reduce((sum, item) => sum + item.quantity, 0)
    }),
    { name: CART_STORAGE_KEY, storage: cartStorage }
  )
);
