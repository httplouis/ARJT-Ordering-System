"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm rounded-3xl border bg-card p-6 text-center shadow-soft">
        <h1 className="text-xl font-bold">Something went sideways</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please refresh the app or try again in a moment.
        </p>
        <Button className="mt-5 w-full" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
