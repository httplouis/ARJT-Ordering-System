"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const MessageWidget = dynamic(() => import("./message-widget"), { ssr: false });

export default function MessageWidgetWrapper() {
  const pathname = usePathname();

  // Hide widget on admin pages and on the public orders page
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/orders")) {
    return null;
  }

  return <MessageWidget />;
}
