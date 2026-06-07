import { redirect } from "next/navigation";
import { getStorefrontData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Storefront } from "@/components/storefront/storefront";
import MessageWidgetWrapper from "@/components/contact/message-widget-wrapper";

export default async function Home() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // If profile doesn't exist, try to create it
  if (error && error.code === "PGRST116") {
    const fullName = user.user_metadata?.full_name || user.email;
    await supabase.from("users").insert({
      id: user.id,
      full_name: fullName,
      role: "customer",
    });
    // Redirect to reload and get the new profile
    redirect("/");
  }

  if (error || !profile) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  const data = await getStorefrontData();
  return (
    <>
      <Storefront {...data} user={profile} />
      {/* Floating message widget for customers (client-only) */}
      <MessageWidgetWrapper />
    </>
  );
}
