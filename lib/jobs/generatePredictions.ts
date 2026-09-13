import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { fitTeamStrengths, expectedGoals, type HistoricalMatch } from "@/lib/prediction-engine/football/poisson";
import { fitRho } from "@/lib/prediction-engine/football/dixonColes";
import { updateRatings } from "@/lib/prediction-engine/elo/elo";
import { generateFootball1X2, generateBasketballMoneyline, type PredictionOutput } from "@/lib/prediction-engine/index";
import { getActiveLeagues, type LeagueRow } from "./teamResolution";
import { getOrCreateActiveModelVersion } from "./modelVersions";
import type { JobResult } from "./jobRunner";

const MAX_HISTORY_MATCHES = 500;
const MIN_HISTORY_MATCHES = 4;
const HOME_ADVANTAGE_ELO = 60;
const ELO_K = 20;
const ELO_START = 1500;

interface FinishedMatchRow {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  scheduled_at: string;
}

interface UpcomingMatchRow {
  id: string;
  home_team_id: string;
  away_team_id: string;
}

/** Simple chronological Elo pass over a league's recent history — recomputed
 * fresh each run rather than incrementally persisted across runs. A working
 * v1 simplification (documented, not silent): a persistent, incrementally-
 * updated team_ratings history would avoid re-deriving this every time. */
function computeEloRatings(matches: FinishedMatchRow[]): Record<string, number> {
  const ratings: Record<string, number> = {};
  const sorted = [...matches].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );
  for (const m of sorted) {
    ratings[m.home_team_id] ??= ELO_START;
    ratings[m.away_team_id] ??= ELO_START;
    const actualHome = m.home_score > m.away_score ? 1 : m.home_score === m.away_score ? 0.5 : 0;
    const { newRatingA, newRatingB } = updateRatings(
      ratings[m.home_team_id],
      ratings[m.away_team_id],
      actualHome,
      ELO_K,
      HOME_ADVANTAGE_ELO
    );
    ratings[m.home_team_id] = newRatingA;
    ratings[m.away_team_id] = newRatingB;
  }
  return ratings;
}

async function getAveragedPrices(
  matchId: string,
  market: "1x2" | "moneyline"
): Promise<Record<string, number> | null> {
  const admin = getAdminClient();
  const { data } = await admin.from("odds").select("outcome, price").eq("match_id", matchId).eq("market", market);
  if (!data || data.length === 0) return null;

  const sums: Record<string, { sum: number; count: number }> = {};
  for (const row of data as { outcome: string; price: number }[]) {
    sums[row.outcome] ??= { sum: 0, count: 0 };
    sums[row.outcome].sum += row.price;
    sums[row.outcome].count++;
  }
  const avg: Record<string, number> = {};
  for (const key of Object.keys(sums)) avg[key] = sums[key].sum / sums[key].count;
  return avg;
}

async function persistPredictions(
  matchId: string,
  modelVersionId: string,
  outputs: PredictionOutput[]
): Promise<number> {
  const admin = getAdminClient();
  let written = 0;
  for (const o of outputs) {
    const { error } = await admin.from("predictions").upsert(
      {
        match_id: matchId,
        model_version_id: modelVersionId,
        market: o.outcome === "draw" || outputs.length === 3 ? "1x2" : "moneyline",
        outcome: o.outcome,
        p_model: o.pModel,
        p_market_novig: o.pMarketNoVig,
        devig_method: o.devigMethod,
        edge: o.edge,
        edge_se: o.edgeSe,
        opportunity_score: o.opportunityScore,
        confidence_score: o.confidenceScore,
        wilson_ci_low: o.wilsonCiLow,
        wilson_ci_high: o.wilsonCiHigh,
        is_actionable: o.isActionable,
        missingness: o.missingness,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "match_id,model_version_id,market,outcome" }
    );
    if (!error) written++;
  }
  return written;
}

async function generateForFootballLeague(league: LeagueRow, modelVersionId: string): Promise<JobResult> {
  const admin = getAdminClient();

  const { data: history } = await admin
    .from("matches")
    .select("home_team_id, away_team_id, home_score, away_score, scheduled_at")
    .eq("league_id", league.id)
    .eq("status", "final")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(MAX_HISTORY_MATCHES);

  const finished = (history ?? []) as FinishedMatchRow[];
  if (finished.length < MIN_HISTORY_MATCHES) {
    return { rowsSkipped: 1 }; // not enough history yet — honest no-op, not a guess
  }

  const historicalMatches: HistoricalMatch[] = finished.map((m) => ({
    homeTeamId: m.home_team_id,
    awayTeamId: m.away_team_id,
    homeGoals: m.home_score,
    awayGoals: m.away_score,
  }));

  const teamStrengths = fitTeamStrengths(historicalMatches);
  const rho = fitRho(
    historicalMatches.map((m) => {
      const { lambdaHome, lambdaAway } = expectedGoals(teamStrengths, m.homeTeamId, m.awayTeamId);
      return { lambdaHome, lambdaAway, homeGoals: m.homeGoals, awayGoals: m.awayGoals };
    })
  );
  const eloRatings = computeEloRatings(finished);

  const { data: upcoming } = await admin
    .from("matches")
    .select("id, home_team_id, away_team_id")
    .eq("league_id", league.id)
    .eq("status", "scheduled");

  let processed = 0;
  let written = 0;
  let skipped = 0;

  for (const match of (upcoming ?? []) as UpcomingMatchRow[]) {
    processed++;
    if (
      !(match.home_team_id in teamStrengths.attack) ||
      !(match.away_team_id in teamStrengths.attack)
    ) {
      skipped++; // a brand-new team with no history yet — genuinely nothing to fit
      continue;
    }

    const prices = await getAveragedPrices(match.id, "1x2");
    if (!prices?.home || !prices?.draw || !prices?.away) {
      skipped++;
      continue;
    }

    const outputs = generateFootball1X2({
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      teamStrengths,
      rho,
      eloHome: eloRatings[match.home_team_id] ?? ELO_START,
      eloAway: eloRatings[match.away_team_id] ?? ELO_START,
      homeAdvantageElo: HOME_ADVANTAGE_ELO,
      marketPrices1X2: [prices.home, prices.draw, prices.away],
      sampleSize: finished.length,
    });

    written += await persistPredictions(match.id, modelVersionId, outputs);
  }

  return { rowsProcessed: processed, rowsInserted: written, rowsSkipped: skipped };
}

async function generateForBasketballLeague(league: LeagueRow, modelVersionId: string): Promise<JobResult> {
  const admin = getAdminClient();

  const { data: history } = await admin
    .from("matches")
    .select("home_team_id, away_team_id, home_score, away_score, scheduled_at")
    .eq("league_id", league.id)
    .eq("status", "final")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(MAX_HISTORY_MATCHES);

  const finished = (history ?? []) as FinishedMatchRow[];
  if (finished.length < MIN_HISTORY_MATCHES) {
    return { rowsSkipped: 1 };
  }

  // Net-efficiency proxy per team: (avg points for) - (avg points against)
  // across all home+away appearances. Not a true per-100-possessions
  // rating (we don't ingest pace/possession stats yet) — a documented v1
  // simplification, not a silently wrong number.
  const forSum: Record<string, number> = {};
  const againstSum: Record<string, number> = {};
  const games: Record<string, number> = {};
  for (const m of finished) {
    forSum[m.home_team_id] = (forSum[m.home_team_id] ?? 0) + m.home_score;
    againstSum[m.home_team_id] = (againstSum[m.home_team_id] ?? 0) + m.away_score;
    games[m.home_team_id] = (games[m.home_team_id] ?? 0) + 1;
    forSum[m.away_team_id] = (forSum[m.away_team_id] ?? 0) + m.away_score;
    againstSum[m.away_team_id] = (againstSum[m.away_team_id] ?? 0) + m.home_score;
    games[m.away_team_id] = (games[m.away_team_id] ?? 0) + 1;
  }
  const netEfficiency: Record<string, number> = {};
  for (const teamId of Object.keys(games)) {
    netEfficiency[teamId] = forSum[teamId] / games[teamId] - againstSum[teamId] / games[teamId];
  }
  const eloRatings = computeEloRatings(finished);

  const { data: upcoming } = await admin
    .from("matches")
    .select("id, home_team_id, away_team_id")
    .eq("league_id", league.id)
    .eq("status", "scheduled");

  let processed = 0;
  let written = 0;
  let skipped = 0;

  for (const match of (upcoming ?? []) as UpcomingMatchRow[]) {
    processed++;
    if (!(match.home_team_id in netEfficiency) || !(match.away_team_id in netEfficiency)) {
      skipped++;
      continue;
    }

    const prices = await getAveragedPrices(match.id, "moneyline");
    if (!prices?.home || !prices?.away) {
      skipped++;
      continue;
    }

    const netEfficiencyDiff = netEfficiency[match.home_team_id] - netEfficiency[match.away_team_id];
    const outputs = generateBasketballMoneyline({
      margin: netEfficiencyDiff + 3, // homeEdge folded in directly (points, not per-100)
      marginStdDev: 12,
      eloHome: eloRatings[match.home_team_id] ?? ELO_START,
      eloAway: eloRatings[match.away_team_id] ?? ELO_START,
      homeAdvantageElo: HOME_ADVANTAGE_ELO,
      marketPricesMoneyline: [prices.home, prices.away],
      sampleSize: finished.length,
    });

    written += await persistPredictions(match.id, modelVersionId, outputs);
  }

  return { rowsProcessed: processed, rowsInserted: written, rowsSkipped: skipped };
}

export async function generatePredictions(): Promise<JobResult> {
  const admin = getAdminClient();
  const leagues = await getActiveLeagues();

  let processed = 0;
  let inserted = 0;
  let skipped = 0;

  for (const league of leagues) {
    const { data: sport } = await admin.from("sports").select("key").eq("id", league.sport_id).maybeSingle();
    const sportKey = (sport as { key: string } | null)?.key;
    if (sportKey !== "football" && sportKey !== "basketball") {
      skipped++;
      continue;
    }

    const modelVersionId = await getOrCreateActiveModelVersion(league.sport_id, sportKey);
    const result =
      sportKey === "football"
        ? await generateForFootballLeague(league, modelVersionId)
        : await generateForBasketballLeague(league, modelVersionId);

    processed += result.rowsProcessed ?? 0;
    inserted += result.rowsInserted ?? 0;
    skipped += result.rowsSkipped ?? 0;
  }

  return { rowsProcessed: processed, rowsInserted: inserted, rowsSkipped: skipped };
}
