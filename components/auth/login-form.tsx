"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createClient, syncSessionToServer } from "@/lib/supabase/client";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (data?.session) {
      await syncSessionToServer("SIGNED_IN", data.session);
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

  function isValidEmail(value: string) {
    return /^\S+@\S+\.\S+$/.test(value);
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !isValidEmail(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
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
        <div className="mb-4 relative overflow-hidden rounded-full bg-slate-900/80 p-1 shadow-inner shadow-slate-950/10">
          <span
            className={`pointer-events-none absolute left-1 inset-y-1 w-[calc(50%-0.5rem)] rounded-full bg-primary transition-transform duration-300 ease-out ${
              mode === "register" ? "translate-x-full" : "translate-x-0"
            }`}
          />
          <div className="grid grid-cols-2 gap-0">
            <button
              type="button"
              className={`relative z-10 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
                mode === "login" ? "text-white" : "text-slate-300"
              }`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`relative z-10 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
                mode === "register" ? "text-white" : "text-slate-300"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
        </div>

        {mode === "login" ? (
          <form className="space-y-3" onSubmit={handleLogin}>
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="min-h-[3rem]" />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="min-h-[3rem] pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 inline-flex items-center text-muted-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button className="w-full min-h-[3rem] rounded-full py-3" disabled={loading}>
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
            <Input
              type="email"
              placeholder="123@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-[3rem]"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="min-h-[3rem] pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 inline-flex items-center text-muted-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="min-h-[3rem] pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 inline-flex items-center text-muted-foreground"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button className="w-full min-h-[3rem] rounded-full py-3" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
