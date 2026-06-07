"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export async function clearSupabaseSession(client: SupabaseClient) {
  try {
    await client.auth.signOut();
  } catch {
    // ignore errors when clearing stale auth state
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem("supabase.auth.token");
  }
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || typeof window === "undefined") {
    return null;
  }

  if (!browserClient) {
    browserClient = createSupabaseClient(url, key, {
      auth: {
        persistSession: true,
        storage: window.localStorage,
        flowType: "pkce",
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}

export async function syncSessionToServer(event: string, session: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ event, session })
    });
  } catch (error) {
    console.error("Failed to sync Supabase session to server:", error);
  }
}
