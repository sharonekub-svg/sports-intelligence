"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError("עדכון הסיסמה נכשל, נסה שוב");
      return;
    }

    router.push("/opportunities");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16">
      <Link href="/" className="mb-8 text-center text-lg font-bold tracking-tight">
        Sports Intelligence
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>בחר סיסמה חדשה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">סיסמה חדשה</Label>
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
              {loading ? "מעדכן..." : "עדכן סיסמה"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
