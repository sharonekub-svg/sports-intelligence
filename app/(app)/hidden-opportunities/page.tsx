import { redirect } from "next/navigation";
import Link from "next/link";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OpportunityRow {
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
  matches: { scheduled_at: string; leagues: { name_he: string } | null } | null;
}

// v1: ranked purely by opportunity_score (already risk-adjusted — see
// docs/methodology.md §12). A true "hidden" filter (e.g. low public
// attention/volume on smaller leagues) needs signal this project doesn't
// collect yet; leagues.tier exists in the schema for that future use but
// isn't populated by seed data today, so it's not applied as a filter
// here — documented gap, not a silent one.
async function loadHiddenOpportunities() {
  const admin = getAdminClient();
  const { data } = await admin
    .from("predictions")
    .select(
      "id, match_id, market, outcome, p_model, p_market_novig, edge, opportunity_score, confidence_score, data_quality_score, matches(scheduled_at, leagues(name_he))"
    )
    .eq("is_actionable", true)
    .order("opportunity_score", { ascending: false })
    .limit(50)
    .returns<OpportunityRow[]>();
  return data ?? [];
}

export default async function HiddenOpportunitiesPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  const pro = await isPro(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">הזדמנויות נסתרות</h1>

      {!pro ? (
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">זמין למנויי Pro</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              רשימת ההזדמנויות המדורגות לפי Opportunity Score.
            </p>
            <Link href="/account/billing" className={cn(buttonVariants({ size: "sm" }))}>
              שדרג ל-Pro
            </Link>
          </CardContent>
        </Card>
      ) : (
        <OpportunitiesTable rows={await loadHiddenOpportunities()} />
      )}
    </div>
  );
}

function OpportunitiesTable({ rows }: { rows: OpportunityRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        אין עדיין הזדמנויות — מנוע הניבוי טרם צבר מספיק נתונים בליגות הפעילות.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-right text-muted-foreground">
            <th className="py-2">ליגה</th>
            <th>תאריך</th>
            <th>שוק</th>
            <th>הסתברות מודל</th>
            <th>הסתברות שוק</th>
            <th>פער</th>
            <th>Confidence</th>
            <th>Data Quality</th>
            <th>Opportunity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2">
                <Link href={`/match/${r.match_id}`} className="underline">
                  {r.matches?.leagues?.name_he ?? "—"}
                </Link>
              </td>
              <td>{r.matches ? new Date(r.matches.scheduled_at).toLocaleDateString("he-IL") : "—"}</td>
              <td>
                {r.market} · {r.outcome}
              </td>
              <td>{(r.p_model * 100).toFixed(1)}%</td>
              <td>{r.p_market_novig !== null ? `${(r.p_market_novig * 100).toFixed(1)}%` : "—"}</td>
              <td>{r.edge !== null ? `${(r.edge * 100).toFixed(1)}pp` : "—"}</td>
              <td>{r.confidence_score !== null ? `${(r.confidence_score * 100).toFixed(0)}%` : "—"}</td>
              <td>{r.data_quality_score !== null ? `${(r.data_quality_score * 100).toFixed(0)}%` : "—"}</td>
              <td>{r.opportunity_score?.toFixed(2) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
