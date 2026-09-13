"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { track } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

interface ScannerResult {
  id: string;
  match_id: string;
  market: string;
  outcome: string;
  p_model: number;
  p_market_novig: number | null;
  edge: number | null;
  opportunity_score: number | null;
  confidence_score: number | null;
  data_quality_score: number | null;
  matches: { id: string; scheduled_at: string; league_id: string } | null;
}

export default function ScannerClient({ pro }: { pro: boolean }) {
  const [sportKey, setSportKey] = useState<string>("");
  const [minConfidence, setMinConfidence] = useState("");
  const [minOpportunityScore, setMinOpportunityScore] = useState("");
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    track(ANALYTICS_EVENTS.SCANNER_OPEN);
  }, []);

  async function runSearch() {
    setLoading(true);
    setError(null);
    setSearched(true);

    const params = new URLSearchParams();
    if (sportKey) params.set("sportKey", sportKey);
    if (minConfidence) params.set("minConfidence", minConfidence);
    if (minOpportunityScore) params.set("minOpportunityScore", minOpportunityScore);

    const response = await fetch(`/api/scanner?${params.toString()}`);
    const body = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "שגיאה בטעינת התוצאות");
      return;
    }
    setResults(body.results ?? []);
  }

  return (
    <div className="mt-6">
      {!pro && (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">
              ה-Scanner המלא זמין למנויי Pro בלבד. שדרג כדי לסנן ולראות את כל ההזדמנויות.
            </p>
            <Link href="/account/billing" className={cn(buttonVariants({ size: "sm" }))}>
              שדרג ל-Pro
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">מסננים</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!pro} className="grid gap-4 sm:grid-cols-3 disabled:opacity-50">
            <div className="flex flex-col gap-2">
              <Label>ספורט</Label>
              <Select value={sportKey} onValueChange={(value) => setSportKey(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="הכל" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="football">כדורגל</SelectItem>
                  <SelectItem value="basketball">כדורסל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Confidence מינימלי</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value)}
                placeholder="0.0 - 1.0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Opportunity Score מינימלי</Label>
              <Input
                type="number"
                step={0.1}
                value={minOpportunityScore}
                onChange={(e) => setMinOpportunityScore(e.target.value)}
                placeholder="לדוגמה 1.5"
              />
            </div>
          </fieldset>
          <Button className="mt-4" onClick={runSearch} disabled={!pro || loading}>
            {loading ? "מחפש..." : "חפש"}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && searched && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            אין תוצאות תואמות — ייתכן שמנוע הניבוי טרם צבר מספיק נתונים.
          </p>
        )}
        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="py-2">משחק</th>
                  <th>שוק</th>
                  <th>תוצאה</th>
                  <th>הסתברות מודל</th>
                  <th>פער</th>
                  <th>Opportunity</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/match/${r.match_id}`} className="underline">
                        פרטים
                      </Link>
                    </td>
                    <td>{r.market}</td>
                    <td>{r.outcome}</td>
                    <td>{(r.p_model * 100).toFixed(1)}%</td>
                    <td>{r.edge !== null ? `${(r.edge * 100).toFixed(1)}pp` : "—"}</td>
                    <td>{r.opportunity_score?.toFixed(2) ?? "—"}</td>
                    <td>{r.confidence_score !== null ? `${(r.confidence_score * 100).toFixed(0)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
