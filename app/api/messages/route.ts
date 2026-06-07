import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, message } = body;
    if (!name || !message) {
      return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
    }

    const authClient = await createClient();
    const { data: userData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
    const user = userData?.user ?? null;

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    const insert = await admin.from("messages").insert({ user_id: user?.id ?? null, name, message }).select().single();
    if (insert.error) {
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ message: insert.data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authClient = await createClient();
    const { data: userData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
    const user = userData?.user ?? null;

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    // If admin, return all messages; otherwise return messages for this user only
    let query = admin.from("messages").select("*").order("created_at", { ascending: false });

    if (!user) {
      // not logged in — no personal history
      return NextResponse.json({ messages: [] });
    }

    // check role
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role === "admin") {
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ messages: data });
    }

    const { data, error } = await admin.from("messages").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const messageId = url.pathname.split("/").pop();
    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 });
    }

    const authClient = await createClient();
    const { data: userData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
    const user = userData?.user ?? null;

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    // Only admins can delete messages
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin.from("messages").delete().eq("id", messageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
