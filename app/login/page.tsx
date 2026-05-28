import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/35 p-4">
      <LoginForm searchParams={searchParams} />
    </main>
  );
}
