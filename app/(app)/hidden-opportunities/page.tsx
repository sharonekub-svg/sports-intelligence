import { redirect } from "next/navigation";
import Link from "next/link";
import { EyeOff, Lock } from "lucide-react";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { GapIndicator } from "@/components/data/gap-indicator";
import { ConfidenceIndicator } from "@/components/data/confidence-indicator";
import { DataQualityIndicator } from "@/components/data/data-quality-indicator";
import { OpportunityScore } from "@/components/data/opportunity-score";
import { EmptyState } from "@/components/data/empty-state";

const OUTCOME_LABELS: Record<string, string> = { home: "בית", draw: "תיקו", away: "חוץ" };

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
  matches: {
    scheduled_at: string;
    leagues: { name_he: string } | null;
    home_team: { name_he: string } | null;
    away_team: { name_he: string } | null;
  } | null;
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
      "id, match_id, market, outcome, p_model, p_market_novig, edge, opportunity_score, confidence_score, data_quality_score, matches(scheduled_at, leagues(name_he), home_team:teams!matches_home_team_id_fkey(name_he), away_team:teams!matches_away_team_id_fkey(name_he))"
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
  if (pro) await serverTrack(ANALYTICS_EVENTS.PRO_PAGE_VIEW, { page: "hidden-opportunities" });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">הזדמנויות נסתרות</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        משחקים בליגות פחות נצפות שבהם הפער בין המודל לשוק בולט ביחס לרעש הצפוי.
      </p>

      {!pro ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" strokeWidth={1.75} />
              <span>רשימת ההזדמנויות המדורגות לפי Opportunity Score זמינה למנויי Pro.</span>
            </div>
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
      <EmptyState
        icon={EyeOff}
        title="אין עדיין הזדמנויות נסתרות"
        description="מנוע הניבוי טרם צבר מספיק נתונים בליגות הפעילות."
        className="mt-6"
      />
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">משחק</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">ליגה</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">תוצאה</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">מודל</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">שוק</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">פער</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">Confidence</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">Data Quality</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">Opportunity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-3 py-2.5">
                <Link href={`/match/${r.match_id}`} className="text-primary hover:underline">
                  {r.matches?.home_team?.name_he ?? "—"} נגד {r.matches?.away_team?.name_he ?? "—"}
                </Link>
                <p className="font-data text-xs text-muted-foreground">
                  {r.matches ? new Date(r.matches.scheduled_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }) : "—"}
                </p>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                {r.matches?.leagues?.name_he ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">{OUTCOME_LABELS[r.outcome] ?? r.outcome}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{(r.p_model * 100).toFixed(1)}%</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data text-muted-foreground">
                {r.p_market_novig !== null ? `${(r.p_market_novig * 100).toFixed(1)}%` : "—"}
              </td>
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
  );
}
