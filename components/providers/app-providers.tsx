"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { createClient, syncSessionToServer } from "@/lib/supabase/client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      await syncSessionToServer(event, session);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
