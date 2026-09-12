"use client";

import { useState, type FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password` }
    );

    setLoading(false);
    // Always show success (don't reveal whether the email exists).
    if (resetError) setError(null);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-bold">בדוק את תיבת הדואר</h1>
        <p className="mt-2 text-muted-foreground">
          אם קיים חשבון עם כתובת זו, נשלח אליה קישור לאיפוס סיסמה.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>שחזור סיסמה</CardTitle>
        </CardHeader>
        <CardContent>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "שולח..." : "שלח קישור לאיפוס"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
