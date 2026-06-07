"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, clearSupabaseSession } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileForm } from "./profile-form";

type Profile = {
  full_name: string;
  contact_number?: string;
  role: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadProfile() {
      try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError || !sessionData?.session?.user) {
          if (sessionError) {
            console.error("Auth session load error:", sessionError);
          }
          await clearSupabaseSession(supabaseClient);
          if (isMounted) {
            setLoading(false);
            router.push("/login");
          }
          return;
        }

        const user = sessionData.session.user;

        setEmail(user.email ?? null);

        let profileData: any;
        let profileError: any;

        ({ data: profileData, error: profileError } = await supabaseClient
          .from("users")
          .select("full_name, role")
          .eq("id", user.id)
          .single());

        if (profileError?.code === "42703") {

          if (profileError && profileError.code === "PGRST116") {
            const fullName = user.user_metadata?.full_name || user.email || "Customer";
            const { error: insertError } = await supabaseClient.from("users").insert({
              id: user.id,
              full_name: fullName,
              role: "customer"
            });

            if (insertError) {
              setError("Unable to create profile.");
              setLoading(false);
              return;
            }

            ({ data: profileData, error: profileError } = await supabaseClient
              .from("users")
              .select("full_name, role")
              .eq("id", user.id)
              .single());
          }
        }

        if (profileError && profileError.code === "PGRST116") {
          const fullName = user.user_metadata?.full_name || user.email || "Customer";
          const insertPayload: { id: string; full_name: string; role: string; contact_number?: string } = {
            id: user.id,
            full_name: fullName,
            role: "customer"
          };

          // Only include contact_number if the schema supports it.
          if (!profileError || profileError.code !== "42703") {
            insertPayload.contact_number = "";
          }

          const { error: insertError } = await supabaseClient.from("users").insert(insertPayload);

          if (insertError) {
            setError("Unable to create profile.");
            setLoading(false);
            return;
          }

          ({ data: profileData, error: profileError } = await supabaseClient
            .from("users")
            .select("full_name, role")
            .eq("id", user.id)
            .single());
        }

        if (profileError || !profileData) {
          console.error("Profile query error:", profileError);
          await clearSupabaseSession(supabaseClient);
          if (isMounted) {
            setError("Unable to load profile.");
            setLoading(false);
            router.push("/login");
          }
          return;
        }

        if (isMounted) {
            setProfile({ ...profileData, contact_number: profileData.contact_number ?? "" } as Profile);
        }

        if (isMounted) {
          setProfile(profileData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Profile load error:", err);
        if (isMounted) {
          setError("An error occurred while loading your profile.");
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border bg-background p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border bg-background p-6 shadow-soft">
            <p className="text-sm text-rose-600">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={() => router.push("/login")}>Go to login</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) return null;

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
              <h1 className="text-3xl font-black">Welcome back, {profile.full_name ?? email}</h1>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-muted p-6">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">Account details</span>
              
              {!profile.contact_number && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <p className="font-semibold">Contact number required</p>
                  <p className="mt-1 text-sm text-rose-800">
                    Add your contact number so the admin can reach you if your order cannot be fulfilled.
                  </p>
                </div>
              )}
              
              <ProfileForm fullName={profile.full_name} contactNumber={profile.contact_number} />

              <div className="grid gap-1 rounded-2xl bg-muted/70 p-4">
                <p className="font-medium">
                  Email: <span className="text-foreground">{email}</span>
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

          <LogoutButton className="w-full py-3 text-base font-semibold" />
        </section>
      </div>
    </main>
  );
}
