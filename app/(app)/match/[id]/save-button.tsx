"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SaveButton({ matchId }: { matchId: string }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const response = await fetch("/api/saved-matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    setLoading(false);
    if (response.ok) setSaved(true);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSave} disabled={loading || saved}>
      {saved ? "נשמר ✓" : "שמור משחק"}
    </Button>
  );
}
