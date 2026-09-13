import { redirect } from "next/navigation";
import Link from "next/link";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { expectedCalibrationError } from "@/lib/prediction-engine/calibration/ece";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  return (
    <div>
      <h1 className="text-2xl font-bold">נקודות עיוורות בשוק</h1>

      {!pro ? (
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">זמין למנויי Pro</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">ביצועי המודל לפי ליגה.</p>
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
      <p className="mt-6 text-sm text-muted-foreground">
        אין עדיין מספיק נתונים לניתוח לפי ליגה.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-right text-muted-foreground">
            <th className="py-2">ליגה</th>
            <th>מספר משחקים</th>
            <th>גודל מדגם (מיושב)</th>
            <th>פער ממוצע</th>
            <th>פער חציוני</th>
            <th>ECE</th>
            <th>טווח תאריכים</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.leagueId} className="border-b last:border-0">
              <td className="py-2">{r.leagueName}</td>
              <td>{r.matchCount}</td>
              <td>
                {r.settledCount}
                {r.settledCount < 15 && (
                  <span className="text-muted-foreground"> (מדגם קטן)</span>
                )}
              </td>
              <td>{(r.meanEdge * 100).toFixed(1)}pp</td>
              <td>{(r.medianEdge * 100).toFixed(1)}pp</td>
              <td>{r.ece !== null ? r.ece.toFixed(3) : "—"}</td>
              <td>
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
