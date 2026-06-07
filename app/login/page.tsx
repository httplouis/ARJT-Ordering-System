import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.06),_transparent_20%),linear-gradient(180deg,#03151a_0%,#051a1f_100%)] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.14),_transparent_20%)]" />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center">
            <div className="relative h-20 w-48 overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-3 shadow-soft backdrop-blur-sm">
              <Image src="/ARJT_LOGO_nobg.png" alt="ARJT logo" fill className="object-contain" />
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:p-8">
            <LoginForm searchParams={searchParams} />
          </div>
        </div>
      </div>
    </main>
  );
}
