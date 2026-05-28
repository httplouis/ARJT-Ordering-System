import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm rounded-3xl border bg-card p-6 text-center shadow-soft">
        <h1 className="text-3xl font-black text-primary">404</h1>
        <p className="mt-2 font-semibold">This page is not on the shelf.</p>
        <Button asChild className="mt-5 w-full">
          <Link href="/">Back to ordering</Link>
        </Button>
      </div>
    </main>
  );
}
