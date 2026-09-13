import { redirect } from "next/navigation";
import Link from "next/link";
import { TriangleAlert, Lock } from "lucide-react";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { expectedCalibrationError } from "@/lib/prediction-engine/calibration/ece";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { GapIndicator } from "@/components/data/gap-indicator";
import { TermTooltip } from "@/components/data/term-tooltip";
import { EmptyState } from "@/components/data/empty-state";

interface PredictionRow {
  id: string;
  p_model: number;
  edge: number | null;
  generated_at: string;
  matches: { league_id: string; leagues: { name_he: string } | null } | null;
}

interface LeagueAggregate {
  leagueId: string;
  leagueName: string;
  matchCount: number;
  settledCount: number;
  meanEdge: number;
  medianEdge: number;
  ece: number | null;
  dateFrom: string;
  dateTo: string;
}

// v1 aggregates in application code (fetch + group in JS) rather than a
// dedicated SQL view/RPC — correct at today's data volume, but the
// obvious next step once a league accumulates thousands of predictions is
// to push this aggregation into Postgres.
async function loadBlindSpots(): Promise<LeagueAggregate[]> {
  const admin = getAdminClient();

  const { data: predictions } = await admin
    .from("predictions")
    .select("id, p_model, edge, generated_at, matches(league_id, leagues(name_he))")
    .eq("is_actionable", true)
    .returns<PredictionRow[]>();
  if (!predictions || predictions.length === 0) return [];

  const predictionIds = predictions.map((p) => p.id);
  const { data: results } = await admin
    .from("prediction_results")
    .select("prediction_id, status")
    .in("prediction_id", predictionIds)
    .in("status", ["correct", "incorrect"])
    .returns<{ prediction_id: string; status: string }[]>();
  const statusByPrediction = new Map((results ?? []).map((r) => [r.prediction_id, r.status]));

  const byLeague = new Map<
    string,
    { name: string; edges: number[]; outcomes: { p: number; outcome: 0 | 1 }[]; dates: string[] }
  >();

  for (const pred of predictions) {
    const leagueId = pred.matches?.league_id;
    if (!leagueId) continue;
    const bucket = byLeague.get(leagueId) ?? {
      name: pred.matches?.leagues?.name_he ?? "—",
      edges: [],
      outcomes: [],
      dates: [],
    };
    if (pred.edge !== null) bucket.edges.push(pred.edge);
    bucket.dates.push(pred.generated_at);
    const status = statusByPrediction.get(pred.id);
    if (status === "correct" || status === "incorrect") {
      bucket.outcomes.push({ p: pred.p_model, outcome: status === "correct" ? 1 : 0 });
    }
    byLeague.set(leagueId, bucket);
  }

  const aggregates: LeagueAggregate[] = [];
  for (const [leagueId, bucket] of byLeague) {
    const sortedEdges = [...bucket.edges].sort((a, b) => a - b);
    const mid = Math.floor(sortedEdges.length / 2);
    const medianEdge =
      sortedEdges.length === 0
        ? 0
        : sortedEdges.length % 2 === 0
          ? (sortedEdges[mid - 1] + sortedEdges[mid]) / 2
          : sortedEdges[mid];
    const meanEdge = sortedEdges.length ? sortedEdges.reduce((a, b) => a + b, 0) / sortedEdges.length : 0;
    const sortedDates = [...bucket.dates].sort();

    aggregates.push({
      leagueId,
      leagueName: bucket.name,
      matchCount: bucket.edges.length,
      settledCount: bucket.outcomes.length,
      meanEdge,
      medianEdge,
      ece: bucket.outcomes.length > 0 ? expectedCalibrationError(bucket.outcomes).ece : null,
      dateFrom: sortedDates[0] ?? "",
      dateTo: sortedDates[sortedDates.length - 1] ?? "",
    });
  }

  return aggregates.sort((a, b) => b.matchCount - a.matchCount);
}

export default async function MarketBlindSpotsPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  const pro = await isPro(user.id);
  if (pro) await serverTrack(ANALYTICS_EVENTS.PRO_PAGE_VIEW, { page: "market-blind-spots" });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Market Blind Spots</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ליגות שבהן השוק עוקב פחות מקרוב — פערים עקביים בין המודל למחיר, לפי ליגה.
      </p>

      {!pro ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" strokeWidth={1.75} />
              <span>ביצועי המודל לפי ליגה זמינים למנויי Pro.</span>
            </div>
            <Link href="/account/billing" className={cn(buttonVariants({ size: "sm" }))}>
              שדרג ל-Pro
            </Link>
          </CardContent>
        </Card>
      ) : (
        <BlindSpotsTable rows={await loadBlindSpots()} />
      )}
    </div>
  );
}

function BlindSpotsTable({ rows }: { rows: LeagueAggregate[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="אין עדיין מספיק נתונים"
        description="הניתוח לפי ליגה יופיע ברגע שיצטברו מספיק תחזיות פעילות."
        className="mt-6"
      />
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">#</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">ליגה</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">משחקים</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">גודל מדגם מיושב</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">פער ממוצע</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">פער חציוני</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">
              <TermTooltip term="calibration">ECE</TermTooltip>
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">טווח תאריכים</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.leagueId} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-3 py-2.5 font-data text-muted-foreground">{i + 1}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-medium">{r.leagueName}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{r.matchCount}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">
                {r.settledCount}
                {r.settledCount < 15 && (
                  <span className="ms-1.5 text-xs text-warning">מדגם קטן</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <GapIndicator value={r.meanEdge} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <GapIndicator value={r.medianEdge} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">
                {r.ece !== null ? r.ece.toFixed(3) : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data text-muted-foreground">
                {r.dateFrom ? new Date(r.dateFrom).toLocaleDateString("he-IL") : "—"} –{" "}
                {r.dateTo ? new Date(r.dateTo).toLocaleDateString("he-IL") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
