import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { withProviderFallback } from "@/lib/providers/providerRegistry";
import type { RawScoreEvent } from "@/lib/providers/types";
import { findBestMatch } from "@/lib/idempotency/fuzzyMatch";
import { getActiveLeagues, type LeagueRow } from "./teamResolution";
import type { JobResult } from "./jobRunner";

// Forward-only status transitions — never let a re-fetch downgrade an
// already-final match back to live/scheduled (methodology's settlement
// state-machine rule, ported from hapogea's mergeRows() rank map).
const STATUS_RANK: Record<string, number> = {
  scheduled: 0,
  live: 1,
  postponed: 2,
  cancelled: 2,
  final: 3,
};

interface OurMatch {
  id: string;
  status: string;
  scheduled_at: string;
  home_team_id: string;
  away_team_id: string;
}

/**
 * Fuzzy-matches our tracked matches against the free scores provider's
 * results (which use its own ids and team-name spellings, not ours) via
 * lib/idempotency/fuzzyMatch.ts, and updates status/score — never
 * regressing an already-final match.
 */
export async function refreshScores(): Promise<JobResult> {
  const admin = getAdminClient();
  const leagues = await getActiveLeagues();

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  const leaguesBySport = new Map<string, LeagueRow[]>();
  for (const league of leagues) {
    const arr = leaguesBySport.get(league.sport_id) ?? [];
    arr.push(league);
    leaguesBySport.set(league.sport_id, arr);
  }

  for (const [sportId, leaguesForSport] of leaguesBySport) {
    const { data: sport } = await admin.from("sports").select("key").eq("id", sportId).maybeSingle();
    const sportKey = (sport as { key: string } | null)?.key;
    if (sportKey !== "football" && sportKey !== "basketball") {
      skipped++;
      continue;
    }

    let results: RawScoreEvent[];
    try {
      const sinceIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      results = await withProviderFallback("scores", (provider) => provider.getResults(sportKey, sinceIso));
    } catch {
      skipped++;
      continue;
    }

    for (const league of leaguesForSport) {
      const { data: ourMatches } = await admin
        .from("matches")
        .select("id, status, scheduled_at, home_team_id, away_team_id")
        .eq("league_id", league.id)
        .neq("status", "final");
      if (!ourMatches || ourMatches.length === 0) continue;

      const teamIds = Array.from(
        new Set((ourMatches as OurMatch[]).flatMap((m) => [m.home_team_id, m.away_team_id]))
      );
      const { data: teams } = await admin.from("teams").select("id, name_en").in("id", teamIds);
      const nameById = new Map(
        (teams ?? []).map((t: { id: string; name_en: string }) => [t.id, t.name_en])
      );

      for (const ourMatch of ourMatches as OurMatch[]) {
        processed++;
        const target = {
          homeTeamName: nameById.get(ourMatch.home_team_id) ?? "",
          awayTeamName: nameById.get(ourMatch.away_team_id) ?? "",
          scheduledAt: ourMatch.scheduled_at,
        };
        const best = findBestMatch(target, results);
        if (!best) {
          skipped++;
          continue;
        }

        const newRank = STATUS_RANK[best.status] ?? 0;
        const currentRank = STATUS_RANK[ourMatch.status] ?? 0;
        if (newRank < currentRank) {
          skipped++;
          continue;
        }

        await admin
          .from("matches")
          .update({
            status: best.status,
            home_score: best.homeScore ?? null,
            away_score: best.awayScore ?? null,
          })
          .eq("id", ourMatch.id);
        updated++;
      }
    }
  }

  return { rowsProcessed: processed, rowsUpdated: updated, rowsSkipped: skipped };
}
