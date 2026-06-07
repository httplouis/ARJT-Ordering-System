"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Mode = "login" | "register";

export function LoginForm({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase env vars are not configured.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (data?.user?.id && typeof window !== "undefined") {
      window.localStorage.setItem("arjt-user-id", data.user.id);
    }

    // Wait a moment for profile to be available, then redirect
    setTimeout(() => {
      router.refresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push((params.next ?? "/") as any);
    }, 500);
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase env vars are not configured.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { username, first_name: firstName, last_name: lastName },
        emailRedirectTo: undefined, // Disable email confirmation
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("rate limit") || error.message.includes("email")) {
        toast.error("Too many signup attempts. Please wait a few minutes and try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    
    // Auto-insert customer into public.users profile table
    if (data.user?.id) {
      const fullName = `${firstName} ${lastName}`.trim() || username || email;
      const { error: profileError } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          full_name: fullName,
          role: "customer",
        });
      
      if (profileError) {
        console.error("Profile insert error:", profileError);
        // Don't fail signup for profile error, just notify
        toast.warning("Account created but profile setup had an issue. Please try logging in.");
      }
    }
    
    toast.success("Account created successfully! Please log in with your email.");
    setMode("login");
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Customer Login" : "Create Customer Account"}</CardTitle>
        <p className="text-xs text-muted-foreground mt-2">
          {mode === "login" ? "Sign in to order food" : "Create an account to get started"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant={mode === "login" ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("login")}
          >
            Login
          </Button>
          <Button
            type="button"
            variant={mode === "register" ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("register")}
          >
            Register
          </Button>
        </div>

        {mode === "login" ? (
          <form className="space-y-3" onSubmit={handleLogin}>
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="min-h-[3rem]" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="min-h-[3rem]" />
            <Button className="w-full py-3" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleRegister}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="min-h-[3rem]" />
              <Input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="min-h-[3rem]" />
            </div>
            <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="min-h-[3rem]" />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="min-h-[3rem]" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="min-h-[3rem]" />
            <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="min-h-[3rem]" />
            <Button className="w-full py-3" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
