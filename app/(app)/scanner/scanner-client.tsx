"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Radar } from "lucide-react";
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
import { GapIndicator } from "@/components/data/gap-indicator";
import { ConfidenceIndicator } from "@/components/data/confidence-indicator";
import { DataQualityIndicator } from "@/components/data/data-quality-indicator";
import { OpportunityScore } from "@/components/data/opportunity-score";
import { TableSkeleton } from "@/components/data/skeletons";
import { EmptyState } from "@/components/data/empty-state";
import { ErrorState } from "@/components/data/error-state";

const OUTCOME_LABELS: Record<string, string> = { home: "בית", draw: "תיקו", away: "חוץ" };
const LIMIT = 25;

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
  matches: {
    id: string;
    scheduled_at: string;
    league_id: string;
    home_team: { name_he: string } | null;
    away_team: { name_he: string } | null;
    leagues: { name_he: string } | null;
  } | null;
}

export default function ScannerClient({ pro }: { pro: boolean }) {
  const [sportKey, setSportKey] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minConfidence, setMinConfidence] = useState("");
  const [minOpportunityScore, setMinOpportunityScore] = useState("");
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    track(ANALYTICS_EVENTS.SCANNER_OPEN);
  }, []);

  function buildParams(nextCursor: number) {
    const params = new URLSearchParams();
    if (sportKey) params.set("sportKey", sportKey);
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());
    if (minConfidence) params.set("minConfidence", minConfidence);
    if (minOpportunityScore) params.set("minOpportunityScore", minOpportunityScore);
    params.set("limit", String(LIMIT));
    params.set("cursor", String(nextCursor));
    return params;
  }

  async function runSearch() {
    setLoading(true);
    setError(null);
    setSearched(true);
    setCursor(0);

    const response = await fetch(`/api/scanner?${buildParams(0).toString()}`);
    const body = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "שגיאה בטעינת התוצאות");
      setResults([]);
      return;
    }
    const rows: ScannerResult[] = body.results ?? [];
    setResults(rows);
    setHasMore(rows.length === LIMIT);
  }

  async function loadMore() {
    setLoadingMore(true);
    const nextCursor = cursor + LIMIT;
    const response = await fetch(`/api/scanner?${buildParams(nextCursor).toString()}`);
    const body = await response.json();
    setLoadingMore(false);
    if (!response.ok) {
      setError(body.error ?? "שגיאה בטעינת התוצאות");
      return;
    }
    const rows: ScannerResult[] = body.results ?? [];
    setResults((prev) => [...prev, ...rows]);
    setCursor(nextCursor);
    setHasMore(rows.length === LIMIT);
  }

  return (
    <div className="mt-6">
      {!pro && (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" strokeWidth={1.75} />
              <span>ה-Scanner המלא זמין למנויי Pro בלבד. שדרג כדי לסנן ולראות את כל ההזדמנויות.</span>
            </div>
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
          <fieldset disabled={!pro} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 disabled:opacity-50">
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
              <Label>מתאריך</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>עד תאריך</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
                placeholder="0.0 – 1.0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Opportunity מינימלי</Label>
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
        {loading && <TableSkeleton rows={8} cols={7} />}

        {!loading && error && <ErrorState title={error} onRetry={runSearch} />}

        {!loading && !error && searched && results.length === 0 && (
          <EmptyState
            icon={Radar}
            title="אין תוצאות תואמות"
            description="ייתכן שהמסננים מחמירים מדי, או שמנוע הניבוי טרם צבר מספיק נתונים עבור הטווח הזה."
          />
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-start text-xs text-muted-foreground">
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">משחק</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">ליגה</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">תוצאה</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">מודל</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">פער</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">Confidence</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">Data Quality</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Link href={`/match/${r.match_id}`} className="text-primary hover:underline">
                          {r.matches?.home_team?.name_he ?? "—"} נגד {r.matches?.away_team?.name_he ?? "—"}
                        </Link>
                        <p className="font-data text-xs text-muted-foreground">
                          {r.matches ? new Date(r.matches.scheduled_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {r.matches?.leagues?.name_he ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">{OUTCOME_LABELS[r.outcome] ?? r.outcome}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-data">{(r.p_model * 100).toFixed(1)}%</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.edge !== null ? <GapIndicator value={r.edge} /> : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.confidence_score !== null ? <ConfidenceIndicator score={r.confidence_score} /> : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.data_quality_score !== null ? <DataQualityIndicator score={r.data_quality_score} /> : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.opportunity_score !== null ? <OpportunityScore value={r.opportunity_score} /> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "טוען..." : "טען עוד"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
