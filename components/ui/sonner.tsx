"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return <Sonner toastOptions={{ className: "rounded-2xl" }} {...props} />;
}
