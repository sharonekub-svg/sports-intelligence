"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3a7.4 7.4 0 0 1-4.07 1.16c-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.27a12 12 0 0 0 0 10.8l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

/**
 * Requires the Google provider to be enabled in the Supabase Auth
 * dashboard (client id/secret) — that's an external setup step, not
 * something this code can turn on by itself.
 */
export function GoogleAuthButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = getBrowserClient();
    const redirectTo = `${window.location.origin}/api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setError(
        /provider is not enabled|unsupported provider/i.test(oauthError.message)
          ? "כניסה עם Google לא הופעלה עדיין ב-Supabase (Authentication → Sign In / Providers → Google)"
          : `כניסה עם Google נכשלה: ${oauthError.message}`
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" className="gap-2" onClick={handleClick} disabled={loading}>
        <GoogleIcon />
        {loading ? "מעביר ל-Google..." : "המשך עם Google"}
      </Button>
      {error && <p className="text-center text-xs text-muted-foreground">{error}</p>}
    </div>
  );
}
