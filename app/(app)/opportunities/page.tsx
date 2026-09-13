import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { type MatchCardData } from "@/components/data/match-card";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { OpportunitiesBoard, type OpportunityItem } from "./opportunities-board";

const TOTAL_LIMIT = 20;
const FREE_LIMIT = 5;

interface OpportunityRow {
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
    leagues: { name_he: string; sports: { key: string; name_he: string } | null } | null;
  } | null;
}

async function loadTopOpportunities() {
  const admin = getAdminClient();
  const { data } = await admin
    .from("predictions")
    .select(
      "match_id, p_model, p_market_novig, edge, confidence_score, data_quality_score, opportunity_score, matches(scheduled_at, home_team:teams!matches_home_team_id_fkey(name_he), away_team:teams!matches_away_team_id_fkey(name_he), leagues(name_he, sports(key, name_he)))"
    )
    .eq("is_actionable", true)
    .order("opportunity_score", { ascending: false })
    .limit(TOTAL_LIMIT)
    .returns<OpportunityRow[]>();
  return data ?? [];
}

function toMatchCardData(row: OpportunityRow): MatchCardData | null {
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

export default async function OpportunitiesPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  const pro = await isPro(user.id);

  const rows = await loadTopOpportunities();
  await serverTrack(ANALYTICS_EVENTS.OPPORTUNITIES_VIEW, { pro });

  // Global rank (across sports) decides free vs. locked — the first
  // FREE_LIMIT opportunities overall, not per category, stay open.
  const items: OpportunityItem[] = rows
    .map((row, index) => {
      const card = toMatchCardData(row);
      if (!card) return null;
      return {
        card,
        sportKey: row.matches?.leagues?.sports?.key ?? "other",
        sportLabel: row.matches?.leagues?.sports?.name_he ?? "אחר",
        unlocked: pro || index < FREE_LIMIT,
      };
    })
    .filter((item): item is OpportunityItem => item !== null);

  return (
    <OpportunitiesBoard items={items} pro={pro} totalLimit={TOTAL_LIMIT} freeLimit={FREE_LIMIT} />
  );
}
