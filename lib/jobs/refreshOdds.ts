import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { withProviderFallback } from "@/lib/providers/providerRegistry";
import type { RawOddsEvent } from "@/lib/providers/types";
import { getActiveLeagues } from "./teamResolution";
import type { JobResult } from "./jobRunner";

/**
 * Lightweight, frequent (every ~15min) re-fetch of odds for matches
 * ingestMatches already created — looked up by external_ref, never
 * creating new teams/matches (that's ingestMatches's job, run less often).
 * A match whose external_ref isn't found yet is skipped, not created.
 */
export async function refreshOdds(): Promise<JobResult> {
  const admin = getAdminClient();
  const leagues = await getActiveLeagues();

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  for (const league of leagues) {
    const { data: sport } = await admin.from("sports").select("key").eq("id", league.sport_id).maybeSingle();
    const sportKey = (sport as { key: string } | null)?.key;
    if (sportKey !== "football" && sportKey !== "basketball") {
      skipped++;
      continue;
    }
    const market = sportKey === "football" ? "1x2" : "moneyline";

    let events: RawOddsEvent[];
    try {
      events = await withProviderFallback("odds", (provider) =>
        provider.getUpcomingOdds({ sportKey: league.provider_key })
      );
    } catch {
      skipped++;
      continue;
    }

    for (const event of events) {
      processed++;
      const { data: match } = await admin
        .from("matches")
        .select("id")
        .eq("league_id", league.id)
        .eq("external_ref->>the_odds_api", event.externalId)
        .maybeSingle();

      if (!match) {
        skipped++;
        continue;
      }
      const matchId = (match as { id: string }).id;

      for (const bookmaker of event.bookmakers) {
        const h2h = bookmaker.markets.find((m) => m.key === "h2h");
        if (!h2h) continue;

        for (const outcome of h2h.outcomes) {
          const outcomeKey =
            outcome.name === event.homeTeamName
              ? "home"
              : outcome.name === event.awayTeamName
                ? "away"
                : outcome.name.toLowerCase() === "draw"
                  ? "draw"
                  : null;
          if (!outcomeKey) continue;

          const fetchedAt = new Date().toISOString();
          await admin.from("odds").upsert(
            {
              match_id: matchId,
              bookmaker: bookmaker.key,
              market,
              outcome: outcomeKey,
              price: outcome.price,
              fetched_at: fetchedAt,
            },
            { onConflict: "match_id,bookmaker,market,outcome" }
          );
          await admin.from("odds_snapshots").insert({
            match_id: matchId,
            bookmaker: bookmaker.key,
            market,
            outcome: outcomeKey,
            price: outcome.price,
            fetched_at: fetchedAt,
          });
          updated++;
        }
      }
    }
  }

  return { rowsProcessed: processed, rowsUpdated: updated, rowsSkipped: skipped };
}
