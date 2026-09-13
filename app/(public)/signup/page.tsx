"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { SkipButton } from "@/components/auth/skip-button";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "כתובת אימייל זו כבר רשומה"
          : "ההרשמה נכשלה, נסה שוב"
      );
      return;
    }

    track(ANALYTICS_EVENTS.SIGNUP);

    // If email confirmation is required, there's no session yet.
    if (!data.session) {
      setConfirmSent(true);
      return;
    }

    router.push("/opportunities");
    router.refresh();
  }

  if (confirmSent) {
    return (
      <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-bold">כמעט סיימת</h1>
        <p className="mt-2 text-muted-foreground">
          שלחנו אימייל אישור ל-{email}. לחץ על הקישור כדי להשלים את ההרשמה.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-12 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle>הרשמה</CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleAuthButton next="/opportunities" />

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            או עם אימייל
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">שם</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "נרשם..." : "הרשמה"}
            </Button>
            <p className="text-sm text-muted-foreground">
              יש לך כבר חשבון?{" "}
              <Link href="/login" className="text-primary hover:underline">
                התחבר
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-center">
        <SkipButton next="/opportunities" />
      </div>
    </div>
  );
}
