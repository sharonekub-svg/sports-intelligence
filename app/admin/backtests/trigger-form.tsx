"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface League {
  id: string;
  name_he: string;
}

export default function TriggerForm({ leagues }: { leagues: League[] }) {
  const router = useRouter();
  const [leagueId, setLeagueId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleTrigger() {
    if (!leagueId) return;
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/admin/backtests/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId }),
    });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(body.error ?? "ההרצה נכשלה");
      return;
    }
    setMessage("ה-Backtest הושלם בהצלחה.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={leagueId} onValueChange={(v) => setLeagueId(v ?? "")}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="בחר ליגה" />
        </SelectTrigger>
        <SelectContent>
          {leagues.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name_he}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleTrigger} disabled={!leagueId || loading}>
        {loading ? "מריץ..." : "הרץ Backtest"}
      </Button>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}
