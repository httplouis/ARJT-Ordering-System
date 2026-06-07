import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const { event, session } = await req.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options as any);
        });
      }
    }
  });

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }

  if (session?.access_token && session?.refresh_token) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }

  return NextResponse.json({ ok: true });
}
