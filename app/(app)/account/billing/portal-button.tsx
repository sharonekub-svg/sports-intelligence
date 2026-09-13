"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const body = await response.json();
    if (!response.ok || !body.url) {
      setError(body.error ?? "שגיאה בפתיחת ניהול המנוי");
      setLoading(false);
      return;
    }
    window.location.href = body.url;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={handleClick} disabled={loading}>
        {loading ? "טוען..." : "נהל את המנוי שלי"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
