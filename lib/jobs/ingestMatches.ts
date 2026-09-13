import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { withProviderFallback } from "@/lib/providers/providerRegistry";
import type { RawOddsEvent } from "@/lib/providers/types";
import { getActiveLeagues, findOrCreateTeam } from "./teamResolution";
import type { JobResult } from "./jobRunner";

function marketKeyFor(sportId240Or227: "football" | "basketball"): "1x2" | "moneyline" {
  return sportId240Or227 === "football" ? "1x2" : "moneyline";
}

async function upsertOddsForEvent(
  matchId: string,
  event: RawOddsEvent,
  market: "1x2" | "moneyline"
): Promise<number> {
  const admin = getAdminClient();
  let written = 0;

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

      const { error } = await admin.from("odds").upsert(
        {
          match_id: matchId,
          bookmaker: bookmaker.key,
          market,
          outcome: outcomeKey,
          price: outcome.price,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "match_id,bookmaker,market,outcome" }
      );
      if (!error) written++;

      await admin.from("odds_snapshots").insert({
        match_id: matchId,
        bookmaker: bookmaker.key,
        market,
        outcome: outcomeKey,
        price: outcome.price,
        fetched_at: new Date().toISOString(),
      });
    }
  }

  return written;
}

/**
 * Ingests upcoming matches + their opening odds for every active league.
 * Idempotent: matches upsert on (league_id, home_team_id, away_team_id,
 * scheduled_at); odds upsert on (match_id, bookmaker, market, outcome);
 * odds_snapshots is append-only by design (market-movement history).
 */
export async function ingestMatches(): Promise<JobResult> {
  const admin = getAdminClient();
  const leagues = await getActiveLeagues();

  let processed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const league of leagues) {
    const { data: sport } = await admin.from("sports").select("key").eq("id", league.sport_id).maybeSingle();
    const sportKey = (sport as { key: string } | null)?.key;
    if (sportKey !== "football" && sportKey !== "basketball") {
      skipped++;
      continue;
    }
    const market = marketKeyFor(sportKey);

    let events: RawOddsEvent[];
    try {
      events = await withProviderFallback("odds", (provider) =>
        provider.getUpcomingOdds({ sportKey: league.provider_key })
      );
    } catch {
      // A single league's odds source failing shouldn't abort the whole
      // ingest run — record it as skipped and move on to the next league.
      skipped++;
      continue;
    }

    for (const event of events) {
      processed++;
      const homeTeamId = await findOrCreateTeam(league.id, event.homeTeamName);
      const awayTeamId = await findOrCreateTeam(league.id, event.awayTeamName);

      const { data: existingMatch } = await admin
        .from("matches")
        .select("id")
        .eq("league_id", league.id)
        .eq("home_team_id", homeTeamId)
        .eq("away_team_id", awayTeamId)
        .eq("scheduled_at", event.commenceTime)
        .maybeSingle();

      let matchId: string;
      if (existingMatch) {
        matchId = (existingMatch as { id: string }).id;
        await admin
          .from("matches")
          .update({ external_ref: { the_odds_api: event.externalId } })
          .eq("id", matchId);
        updated++;
      } else {
        const { data: created, error } = await admin
          .from("matches")
          .insert({
            league_id: league.id,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            scheduled_at: event.commenceTime,
            status: "scheduled",
            external_ref: { the_odds_api: event.externalId },
          })
          .select("id")
          .single();
        if (error || !created) {
          skipped++;
          continue;
        }
        matchId = (created as { id: string }).id;
        inserted++;
      }

      await upsertOddsForEvent(matchId, event, market);
    }
  }

  return { rowsProcessed: processed, rowsInserted: inserted, rowsUpdated: updated, rowsSkipped: skipped };
}
