"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { SkipButton } from "@/components/auth/skip-button";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("אימייל או סיסמה שגויים");
      return;
    }

    track(ANALYTICS_EVENTS.LOGIN);
    router.push(searchParams.get("next") ?? "/opportunities");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-12 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle>התחברות</CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleAuthButton next={searchParams.get("next") ?? "/opportunities"} />

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            או עם אימייל
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "מתחבר..." : "התחבר"}
            </Button>
            <div className="flex justify-between text-sm text-muted-foreground">
              <Link href="/forgot-password" className="text-primary hover:underline">
                שכחת סיסמה?
              </Link>
              <Link href="/signup" className="text-primary hover:underline">
                אין לך חשבון? הרשמה
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-center">
        <SkipButton next={searchParams.get("next") ?? "/opportunities"} />
      </div>
    </div>
  );
}
