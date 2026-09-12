/**
 * Prediction engine facade — the ONLY module in this tree meant to be
 * called directly by `lib/jobs/generatePredictions.ts`. Every module it
 * composes (devig, football/basketball models, Elo, ensemble, Wilson CI,
 * scoring) is a pure function with no I/O of its own; this facade takes
 * plain inputs (already fetched from the DB by the caller) and returns a
 * plain `PredictionOutput[]` (to be persisted by the caller) — it never
 * touches Supabase itself, which is what keeps every piece independently
 * unit-testable.
 */

import { deVig, type DevigMethod } from "./devig";
import { expectedScore as eloExpectedScore } from "./elo/elo";
import { expectedGoals, type TeamStrengths } from "./football/poisson";
import { buildScoreGrid, toMarketProbabilities } from "./football/scoreGrid";
import { winProbability } from "./basketball/marginModel";
import { combineModels } from "./ensemble/combiner";
import { wilsonInterval } from "./uncertainty/wilson";
import { computeEdge } from "./scoring/edge";
import { standardErrorOfEdge, opportunityScore as computeOpportunityScore } from "./scoring/opportunityScore";
import { confidenceScore as computeConfidenceScore } from "./scoring/confidenceScore";
import { classifyMissingness, isActionable, type MissingnessContext } from "./missingData";

export interface PredictionOutput {
  outcome: string;
  pModel: number;
  pMarketNoVig: number;
  devigMethod: DevigMethod;
  edge: number;
  edgeSe: number;
  opportunityScore: number;
  confidenceScore: number;
  confidenceComponents: { calibrationPenalty: number; uncertaintyPenalty: number };
  wilsonCiLow: number;
  wilsonCiHigh: number;
  isActionable: boolean;
  missingness: string | null;
}

interface CommonOptions {
  /** Matches informing the model fit — feeds the Wilson CI/opportunity SE. */
  sampleSize: number;
  /** Std dev of the no-vig probability across recent odds_snapshots, if available. */
  marketVolatility?: number;
  /** This model/league/bucket's historical ECE, if a backtest/live-performance history exists. */
  eceForBucket?: number;
  missingness?: MissingnessContext;
  /** Elo ensemble weight relative to the sport-specific model (default 0.3). */
  eloWeight?: number;
}

function finalizeOutcome(
  outcome: string,
  pModel: number,
  pMarketNoVig: number,
  devigMethod: DevigMethod,
  options: CommonOptions
): PredictionOutput {
  const edge = computeEdge(pModel, pMarketNoVig);
  const se = standardErrorOfEdge(pModel, options.sampleSize, options.marketVolatility ?? 0);
  const wilson = wilsonInterval(Math.round(pModel * options.sampleSize), options.sampleSize);
  const ciWidth = wilson.high - wilson.low;
  const { score: confidence, components } = computeConfidenceScore(
    options.eceForBucket ?? 0.15, // undocumented-history default; see confidenceScore.ts
    ciWidth
  );
  const missingnessType = options.missingness
    ? classifyMissingness(options.missingness)
    : null;

  return {
    outcome,
    pModel,
    pMarketNoVig,
    devigMethod,
    edge,
    edgeSe: se,
    opportunityScore: computeOpportunityScore(edge, se),
    confidenceScore: confidence,
    confidenceComponents: components,
    wilsonCiLow: wilson.low,
    wilsonCiHigh: wilson.high,
    isActionable: missingnessType ? isActionable(missingnessType) : true,
    missingness: missingnessType,
  };
}

// ─── Football (1X2) ─────────────────────────────────────────────────────

export interface FootballInput extends CommonOptions {
  homeTeamId: string;
  awayTeamId: string;
  teamStrengths: TeamStrengths;
  rho: number;
  eloHome: number;
  eloAway: number;
  homeAdvantageElo?: number;
  /** Decimal odds for [home, draw, away]. */
  marketPrices1X2: [number, number, number];
}

export function generateFootball1X2(input: FootballInput): PredictionOutput[] {
  const { lambdaHome, lambdaAway } = expectedGoals(
    input.teamStrengths,
    input.homeTeamId,
    input.awayTeamId
  );
  const grid = buildScoreGrid(lambdaHome, lambdaAway, input.rho);
  const { oneXTwo } = toMarketProbabilities(grid);

  const eloHomeWinProb = eloExpectedScore(input.eloHome, input.eloAway, input.homeAdvantageElo ?? 60);
  // Elo has no native draw concept; split its "non-loss" mass proportionally
  // to the Poisson model's own home/draw ratio so the ensemble stays a
  // valid 3-way distribution.
  const eloWeight = input.eloWeight ?? 0.3;
  const poissonWeight = 1 - eloWeight;

  const pHome = combineModels([
    { source: "poisson-dixon-coles", prob: oneXTwo.home, weight: poissonWeight },
    { source: "elo", prob: eloHomeWinProb * (oneXTwo.home / (oneXTwo.home + oneXTwo.away)), weight: eloWeight },
  ]);
  const pAway = combineModels([
    { source: "poisson-dixon-coles", prob: oneXTwo.away, weight: poissonWeight },
    {
      source: "elo",
      prob: (1 - eloHomeWinProb) * (oneXTwo.away / (oneXTwo.home + oneXTwo.away)),
      weight: eloWeight,
    },
  ]);
  const pDraw = Math.max(0, 1 - pHome - pAway);
  const total = pHome + pDraw + pAway;

  const devig = deVig([...input.marketPrices1X2], { marketShape: "multi-way" });

  return [
    finalizeOutcome("home", pHome / total, devig.probs[0], devig.method, input),
    finalizeOutcome("draw", pDraw / total, devig.probs[1], devig.method, input),
    finalizeOutcome("away", pAway / total, devig.probs[2], devig.method, input),
  ];
}

// ─── Basketball (moneyline) ─────────────────────────────────────────────

export interface BasketballInput extends CommonOptions {
  margin: number;
  marginStdDev: number;
  eloHome: number;
  eloAway: number;
  homeAdvantageElo?: number;
  /** Decimal odds for [home, away]. */
  marketPricesMoneyline: [number, number];
}

export function generateBasketballMoneyline(input: BasketballInput): PredictionOutput[] {
  const marginModelHomeWin = winProbability(input.margin, input.marginStdDev);
  const eloHomeWin = eloExpectedScore(input.eloHome, input.eloAway, input.homeAdvantageElo ?? 60);

  const eloWeight = input.eloWeight ?? 0.3;
  const marginWeight = 1 - eloWeight;

  const pHome = combineModels([
    { source: "margin-model", prob: marginModelHomeWin, weight: marginWeight },
    { source: "elo", prob: eloHomeWin, weight: eloWeight },
  ]);
  const pAway = 1 - pHome;

  const devig = deVig([...input.marketPricesMoneyline], { marketShape: "two-way" });

  return [
    finalizeOutcome("home", pHome, devig.probs[0], devig.method, input),
    finalizeOutcome("away", pAway, devig.probs[1], devig.method, input),
  ];
}
