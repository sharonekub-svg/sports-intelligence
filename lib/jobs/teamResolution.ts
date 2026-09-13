import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Finds a team by case-insensitive exact name match within a league, or
 * creates it. This is a deliberately simple v1 — hapogea's proven approach
 * (Levenshtein similarity + third-party logo/name lookups) is more robust
 * against provider name drift ("Man Utd" vs "Manchester United") but is a
 * substantially larger piece of work; documented here as a real gap, not
 * silently glossed over. `lib/idempotency/fuzzyMatch.ts` already provides
 * the similarity primitive this can be upgraded to use.
 */
export async function findOrCreateTeam(leagueId: string, name: string): Promise<string> {
  const admin = getAdminClient();

  const { data: existing } = await admin
    .from("teams")
    .select("id, name_en")
    .eq("league_id", leagueId);

  const match = (existing ?? []).find(
    (t: { id: string; name_en: string }) => t.name_en.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (match) return match.id;

  const { data: created, error } = await admin
    .from("teams")
    .insert({ league_id: leagueId, name_en: name, name_he: name })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`failed to create team "${name}" in league ${leagueId}: ${error?.message}`);
  }
  return (created as { id: string }).id;
}

export interface LeagueRow {
  id: string;
  sport_id: string;
  provider_key: string;
}

export async function getActiveLeagues(): Promise<LeagueRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("leagues")
    .select("id, sport_id, provider_key")
    .eq("active", true);
  if (error) throw new Error(`failed to load active leagues: ${error.message}`);
  return (data ?? []) as LeagueRow[];
}
