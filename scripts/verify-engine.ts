/**
 * Manual verification script — Batch 2's "Done when" check, run by hand:
 *
 *   pnpm verify:engine
 *
 * Fits a football team-strength model on a small fixture, fetches real
 * live odds from The Odds API if ODDS_API_KEY is configured (falling
 * back to a bundled realistic fixture otherwise), runs the full
 * prediction-engine facade, and prints the result for a human to eyeball:
 * probabilities should sum to ~1 and rank favorites above underdogs.
 *
 * This is a development sanity check, NOT the production job — the real
 * `lib/jobs/generatePredictions.ts` (reading from Supabase instead of a
 * fixture) is wired up in a later build phase.
 */

import { fitTeamStrengths } from "../lib/prediction-engine/football/poisson";
import { generateFootball1X2 } from "../lib/prediction-engine/index";
import type { RawOddsEvent } from "../lib/providers/types";

// Note: this script intentionally does NOT import lib/providers/oddsApiProvider.ts
// directly — that module (like lib/supabase/admin.ts etc.) starts with
// `import "server-only"`, which throws unconditionally outside a Next.js
// server bundle (see __tests__/_shims/server-only.ts for the same issue in
// Vitest). A plain tsx-run script has no such bundler context, so this
// duplicates just the minimal fetch call rather than importing the guarded
// module — the real provider is still what the actual jobs use.
async function fetchLiveOdds(apiKey: string, sportKey: string): Promise<RawOddsEvent[]> {
  const params = new URLSearchParams({
    apiKey,
    regions: "eu,uk,us",
    markets: "h2h",
    oddsFormat: "decimal",
    dateFormat: "iso",
  });
  const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?${params}`);
  if (!response.ok) throw new Error(`the-odds-api request failed: HTTP ${response.status}`);
  const events = (await response.json()) as {
    id: string;
    sport_key: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: { key: string; markets: { key: string; outcomes: { name: string; price: number }[] }[] }[];
  }[];
  return events.map((e) => ({
    externalId: e.id,
    sportKey: e.sport_key,
    homeTeamName: e.home_team,
    awayTeamName: e.away_team,
    commenceTime: e.commence_time,
    bookmakers: e.bookmakers,
  }));
}

// A small, hand-built "recent results" fixture standing in for a rolling
// window of real ingested matches (methodology.md §3.1's 2–4 season
// window). Loosely modeled on a top-of-table / mid-table / bottom-of-table
// pattern, not any specific real season.
const FIXTURE_MATCHES = [
  { homeTeamId: "Arsenal", awayTeamId: "Everton", homeGoals: 3, awayGoals: 0 },
  { homeTeamId: "Everton", awayTeamId: "Arsenal", homeGoals: 0, awayGoals: 2 },
  { homeTeamId: "Arsenal", awayTeamId: "Southampton", homeGoals: 4, awayGoals: 1 },
  { homeTeamId: "Southampton", awayTeamId: "Arsenal", homeGoals: 0, awayGoals: 3 },
  { homeTeamId: "Everton", awayTeamId: "Southampton", homeGoals: 2, awayGoals: 1 },
  { homeTeamId: "Southampton", awayTeamId: "Everton", homeGoals: 1, awayGoals: 2 },
  { homeTeamId: "Arsenal", awayTeamId: "Everton", homeGoals: 2, awayGoals: 1 },
  { homeTeamId: "Southampton", awayTeamId: "Arsenal", homeGoals: 1, awayGoals: 4 },
];

const FIXTURE_ODDS: RawOddsEvent = {
  externalId: "fixture-1",
  sportKey: "soccer_epl",
  homeTeamName: "Arsenal",
  awayTeamName: "Southampton",
  commenceTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  bookmakers: [
    {
      key: "fixture_bookmaker",
      markets: [
        {
          key: "h2h",
          outcomes: [
            { name: "Arsenal", price: 1.3 },
            { name: "Draw", price: 5.5 },
            { name: "Southampton", price: 9.0 },
          ],
        },
      ],
    },
  ],
};

async function getOddsEvent(): Promise<{ event: RawOddsEvent; source: string }> {
  if (process.env.ODDS_API_KEY) {
    try {
      const events = await fetchLiveOdds(process.env.ODDS_API_KEY, "soccer_epl");
      if (events.length > 0) {
        return { event: events[0], source: "The Odds API (live)" };
      }
      console.log("ODDS_API_KEY is set but returned no events — falling back to fixture.");
    } catch (error) {
      console.log(
        `Live Odds API call failed (${error instanceof Error ? error.message : error}) — falling back to fixture.`
      );
    }
  }
  return { event: FIXTURE_ODDS, source: "bundled fixture (ODDS_API_KEY not set)" };
}

function extractH2HPrices(event: RawOddsEvent): [number, number, number] | null {
  const market = event.bookmakers[0]?.markets.find((m) => m.key === "h2h");
  if (!market) return null;
  const home = market.outcomes.find((o) => o.name === event.homeTeamName)?.price;
  const away = market.outcomes.find((o) => o.name === event.awayTeamName)?.price;
  const draw = market.outcomes.find((o) => o.name.toLowerCase() === "draw")?.price;
  if (!home || !away || !draw) return null;
  return [home, draw, away];
}

async function main() {
  console.log("── Sports Intelligence: prediction engine verification ──\n");

  console.log(`Fitting team strengths from ${FIXTURE_MATCHES.length} fixture matches...`);
  const teamStrengths = fitTeamStrengths(FIXTURE_MATCHES);
  console.log("Attack ratings:", teamStrengths.attack);
  console.log("Defence ratings:", teamStrengths.defence);
  console.log("Home advantage:", teamStrengths.homeAdvantage.toFixed(3));
  console.log();

  const { event, source } = await getOddsEvent();
  console.log(`Odds source: ${source}`);
  console.log(`Match: ${event.homeTeamName} vs ${event.awayTeamName}\n`);

  const prices = extractH2HPrices(event);
  if (!prices) {
    console.error("Could not extract 1X2 prices from the odds event — aborting.");
    process.exit(1);
  }

  if (!(event.homeTeamName in teamStrengths.attack) || !(event.awayTeamName in teamStrengths.attack)) {
    console.log(
      "(Live odds returned a matchup outside the fixture's team list — using the fixture's own Arsenal/Southampton matchup instead so the model has ratings to work with.)\n"
    );
    event.homeTeamName = "Arsenal";
    event.awayTeamName = "Southampton";
  }

  const results = generateFootball1X2({
    homeTeamId: event.homeTeamName,
    awayTeamId: event.awayTeamName,
    teamStrengths,
    rho: -0.1,
    eloHome: 1650,
    eloAway: 1480,
    marketPrices1X2: prices,
    sampleSize: FIXTURE_MATCHES.length,
    marketVolatility: 0.02,
  });

  console.log("Prediction results:\n");
  console.log(
    "outcome".padEnd(8),
    "p_model".padEnd(10),
    "p_market".padEnd(10),
    "edge".padEnd(10),
    "opportunity".padEnd(12),
    "confidence".padEnd(11),
    "devig"
  );
  for (const r of results) {
    console.log(
      r.outcome.padEnd(8),
      `${(r.pModel * 100).toFixed(1)}%`.padEnd(10),
      `${(r.pMarketNoVig * 100).toFixed(1)}%`.padEnd(10),
      `${r.edge >= 0 ? "+" : ""}${(r.edge * 100).toFixed(1)}pp`.padEnd(10),
      r.opportunityScore.toFixed(3).padEnd(12),
      `${(r.confidenceScore * 100).toFixed(0)}%`.padEnd(11),
      r.devigMethod
    );
  }

  const sum = results.reduce((s, r) => s + r.pModel, 0);
  console.log(`\nSum of model probabilities: ${sum.toFixed(6)} (should be ≈1)`);

  const home = results.find((r) => r.outcome === "home")!;
  const away = results.find((r) => r.outcome === "away")!;
  const sane = sum > 0.999 && sum < 1.001 && home.pModel > away.pModel;
  console.log(
    sane
      ? "\n✅ Sanity check passed: probabilities sum to 1 and the favorite is ranked above the underdog."
      : "\n❌ Sanity check FAILED — inspect the output above."
  );
  process.exit(sane ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
