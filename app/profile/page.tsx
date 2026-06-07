import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  if (!supabase) redirect("/login");

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("users")
    .select("full_name, contact_number, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login");

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mb-4">
          <Button asChild variant="outline" size="sm" className="inline-flex items-center gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        </div>

        <section className="mx-auto max-w-3xl space-y-6 rounded-3xl border bg-background p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Profile</p>
              <h1 className="text-3xl font-black">Welcome back, {profile.full_name ?? user.email}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <LogoutButton className="inline-flex items-center gap-2" />
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-muted p-6">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">Account details</span>
              <ProfileForm fullName={profile.full_name} contactNumber={profile.contact_number} />
              {!profile.contact_number ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <p className="font-semibold">Phone number required</p>
                  <p className="mt-1 text-sm text-rose-800">
                    Add your contact number here so the admin can reach you if your order cannot be fulfilled.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-1 rounded-2xl bg-muted/70 p-4">
                <p className="font-medium">
                  Email: <span className="text-foreground">{user.email}</span>
                </p>
                <p className="font-medium">
                  Role: <span className="text-foreground capitalize">{profile.role}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl bg-muted/60 p-4 text-sm">
              <p className="font-semibold">Ordering access</p>
              <p className="text-muted-foreground">
                Use this account to access the ordering system. Customers can place orders from the storefront, and admins can
                manage orders from the admin dashboard.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
