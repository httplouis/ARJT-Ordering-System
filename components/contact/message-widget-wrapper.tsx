"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const MessageWidget = dynamic(() => import("./message-widget"), { ssr: false });

export default function MessageWidgetWrapper() {
  const pathname = usePathname();

  // Hide widget on admin, login, and public orders pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/orders") || pathname === "/login") {
    return null;
  }

  return <MessageWidget />;
}
