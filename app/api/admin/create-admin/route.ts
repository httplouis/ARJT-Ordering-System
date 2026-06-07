import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { email, password, fullName } = await request.json();

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { message: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const adminClient = createSupabaseClient(url, serviceKey);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName }
    });

    if (authError || !authData.user?.id) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { message: authError?.message || "Failed to create admin auth user" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    const { error: profileError } = await adminClient
      .from("users")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          role: "admin"
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Error creating admin profile:", profileError);
      return NextResponse.json(
        { message: profileError.message || "Failed to create admin profile" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Admin account created successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
