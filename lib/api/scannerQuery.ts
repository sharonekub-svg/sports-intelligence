import "server-only";
import type { ScannerFilters } from "@/lib/validation/scanner.schema";

/**
 * Minimal structural type for what this module needs from a Supabase
 * client — lets tests inject a lightweight recording fake instead of a
 * real client. `Database` is still a placeholder (see lib/supabase/types.ts),
 * so this stays loosely typed rather than pretending to compile-time
 * safety the generated types don't back yet.
 */
export interface ScannerQueryClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";

async function resolveLeagueIdsForSport(
  client: ScannerQueryClient,
  sportKey: string
): Promise<string[]> {
  const { data: sport } = await client.from("sports").select("id").eq("key", sportKey).maybeSingle();
  if (!sport) return [];
  const { data: leagues } = await client.from("leagues").select("id").eq("sport_id", sport.id);
  return (leagues ?? []).map((l: { id: string }) => l.id);
}

/**
 * Builds (but does not execute — callers `await` it) the filtered
 * predictions query for /api/scanner. Kept separate from the route
 * handler specifically so it can be unit-tested with a recording fake
 * client, without a Next.js request/response or a live Supabase project.
 */
export async function buildScannerQuery(client: ScannerQueryClient, filters: ScannerFilters) {
  let query = client
    .from("predictions")
    .select(
      "id, match_id, market, outcome, p_model, p_market_novig, edge, opportunity_score, confidence_score, data_quality_score, generated_at, matches!inner(id, scheduled_at, league_id, home_team:teams!matches_home_team_id_fkey(name_he), away_team:teams!matches_away_team_id_fkey(name_he), leagues(name_he))"
    )
    .eq("is_actionable", true)
    .order("opportunity_score", { ascending: false })
    .range(filters.cursor, filters.cursor + filters.limit - 1);

  if (filters.leagueId) {
    query = query.eq("matches.league_id", filters.leagueId);
  } else if (filters.sportKey) {
    const leagueIds = await resolveLeagueIdsForSport(client, filters.sportKey);
    // An empty match list must produce zero rows, not "no filter applied" —
    // .in() with an empty array is ambiguous across PostgREST versions, so
    // fall back to an impossible id instead.
    query = query.in("matches.league_id", leagueIds.length > 0 ? leagueIds : [PLACEHOLDER_UUID]);
  }

  if (filters.minConfidence !== undefined) query = query.gte("confidence_score", filters.minConfidence);
  if (filters.minOpportunityScore !== undefined) query = query.gte("opportunity_score", filters.minOpportunityScore);
  if (filters.minDataQuality !== undefined) query = query.gte("data_quality_score", filters.minDataQuality);
  if (filters.dateFrom) query = query.gte("matches.scheduled_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("matches.scheduled_at", filters.dateTo);

  return query;
}
