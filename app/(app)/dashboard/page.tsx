import { redirect } from "next/navigation";
import Link from "next/link";
import { Radar } from "lucide-react";
import { getVerifiedUser } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { MetricCard } from "@/components/data/metric-card";
import { MatchCard, type MatchCardData } from "@/components/data/match-card";
import { EmptyState } from "@/components/data/empty-state";

interface TopOpportunityRow {
  match_id: string;
  p_model: number;
  p_market_novig: number | null;
  edge: number | null;
  confidence_score: number | null;
  data_quality_score: number | null;
  opportunity_score: number | null;
  matches: {
    scheduled_at: string;
    home_team: { name_he: string } | null;
    away_team: { name_he: string } | null;
    leagues: { name_he: string } | null;
  } | null;
}

async function loadDashboardData(userId: string) {
  const admin = getAdminClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [{ count: matchesToday }, { count: activePredictions }, { data: opportunities }, { count: savedCount }] =
    await Promise.all([
      admin.from("matches").select("id", { count: "exact", head: true }).gte("scheduled_at", startOfDay).lt("scheduled_at", endOfDay),
      admin.from("predictions").select("id", { count: "exact", head: true }).eq("is_actionable", true),
      admin
        .from("predictions")
        .select(
          "match_id, p_model, p_market_novig, edge, confidence_score, data_quality_score, opportunity_score, matches(scheduled_at, home_team:teams!matches_home_team_id_fkey(name_he), away_team:teams!matches_away_team_id_fkey(name_he), leagues(name_he))"
        )
        .eq("is_actionable", true)
        .order("opportunity_score", { ascending: false })
        .limit(6)
        .returns<TopOpportunityRow[]>(),
      admin.from("saved_matches").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

  const rows = opportunities ?? [];
  const avgConfidence =
    rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.confidence_score ?? 0), 0) / rows.length
      : null;

  return {
    matchesToday: matchesToday ?? 0,
    activePredictions: activePredictions ?? 0,
    savedCount: savedCount ?? 0,
    avgConfidence,
    topOpportunities: rows,
  };
}

function toMatchCardData(row: TopOpportunityRow): MatchCardData | null {
  if (!row.matches || !row.matches.home_team || !row.matches.away_team) return null;
  return {
    matchId: row.match_id,
    leagueName: row.matches.leagues?.name_he ?? "—",
    scheduledAt: row.matches.scheduled_at,
    homeTeamName: row.matches.home_team.name_he,
    awayTeamName: row.matches.away_team.name_he,
    pModel: row.p_model,
    pMarket: row.p_market_novig ?? 0,
    gap: row.edge ?? 0,
    confidence: row.confidence_score ?? 0,
    dataQuality: row.data_quality_score ?? 0,
    opportunityScore: row.opportunity_score ?? 0,
  };
}

export default async function DashboardPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");

  const data = await loadDashboardData(user.id);
  const cards = data.topOpportunities.map(toMatchCardData).filter((c): c is MatchCardData => c !== null);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">מרכז המודיעין</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            סקירה עדכנית של המשחקים והתחזיות שלך
          </p>
        </div>
        <p className="font-data text-xs text-muted-foreground">
          {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="משחקים היום" value={String(data.matchesToday)} />
        <MetricCard label="תחזיות פעילות" value={String(data.activePredictions)} />
        <MetricCard
          label="Confidence ממוצע"
          value={data.avgConfidence !== null ? `${Math.round(data.avgConfidence * 100)}%` : "—"}
        />
        <MetricCard label="משחקים שמורים" value={String(data.savedCount)} />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">הזדמנויות מובילות</h2>
          <Link href="/scanner" className="text-sm text-primary hover:underline">
            לכל ההזדמנויות ←
          </Link>
        </div>

        {cards.length === 0 ? (
          <EmptyState
            icon={Radar}
            title="עדיין אין הזדמנויות זמינות"
            description="ברגע שהמודל יעבד משחקים קרובים, ההזדמנויות המובילות יופיעו כאן."
            action={{ label: "פתח את ה-Scanner", href: "/scanner" }}
            className="mt-4"
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((match) => (
              <MatchCard key={`${match.matchId}`} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
