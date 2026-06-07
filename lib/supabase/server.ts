import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        // Attempt to set cookies, but Next.js only allows modifying cookies
        // inside Server Actions or Route Handlers. When this helper runs in
        // other server contexts (like server components during rendering),
        // calling `cookieStore.set` will throw. Catch and ignore such errors
        // to avoid crashing the app while still allowing cookie setting when
        // used from an allowed context.
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            // cookieStore.set may throw if used outside of a Route Handler
            // or Server Action — swallow that specific runtime error.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (cookieStore as any).set(name, value, options);
          } catch (err) {
            // Intentionally ignore cookie modification errors here. In
            // a Route Handler/Server Action the set will succeed; during
            // rendering it's expected to fail and is non-fatal.
            // Optionally log in development for visibility.
            if (process.env.NODE_ENV === "development") {
              // eslint-disable-next-line no-console
              console.warn("Supabase cookie set skipped (not in Server Action/Route Handler):", (err as Error).message);
            }
          }
        });
      }
    }
  });
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createSupabaseClient(url, serviceKey);
}
