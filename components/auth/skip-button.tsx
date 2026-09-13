"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * One-click guest entry via Supabase anonymous auth — a real session with
 * a real (anonymous) user id, so RLS and isPro() work exactly as they do
 * for a normal account (isPro just comes back false, same as any free
 * user with no subscription row). Requires "Allow anonymous sign-ins" to
 * be enabled in the Supabase Auth dashboard — that's an external setting,
 * not something this code can turn on by itself.
 */
export function SkipButton({ next = "/opportunities" }: { next?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = getBrowserClient();
    const { error: anonError } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (anonError) {
      setError("כניסה מהירה לא זמינה כרגע");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      >
        {loading ? "נכנס..." : "דלג ותסתכל בלי הרשמה"}
        <ArrowLeft className="size-3.5" strokeWidth={2} />
      </button>
      {error && <p className="text-xs text-muted-foreground">{error}</p>}
    </div>
  );
}
