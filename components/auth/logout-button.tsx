"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    if (!supabase) {
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("arjt-user-id");
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button className={className} variant="destructive" size="sm" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" /> Logout
    </Button>
  );
}
