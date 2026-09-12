import { fitTeamStrengths, type HistoricalMatch, type TeamStrengths } from "./poisson";
import { shrinkEstimate } from "../shrinkage/empiricalBayes";

/**
 * Orchestrates poisson.ts's raw MLE fit with empirical-Bayes shrinkage
 * (methodology.md §8.1) — the principled small-sample/small-league
 * penalty. A team with few matches is pulled toward the league-average
 * attack/defence rather than trusted at its noisy raw value; a
 * well-sampled team is barely shrunk at all.
 */

export interface ShrunkTeamStrengths extends TeamStrengths {
  sampleSize: Record<string, number>;
  shrinkageWeight: Record<string, number>;
}

function countMatchesPerTeam(matches: HistoricalMatch[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of matches) {
    counts[m.homeTeamId] = (counts[m.homeTeamId] ?? 0) + 1;
    counts[m.awayTeamId] = (counts[m.awayTeamId] ?? 0) + 1;
  }
  return counts;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function fitShrunkTeamStrengths(
  matches: HistoricalMatch[],
  options: { iterations?: number; kappa?: number } = {}
): ShrunkTeamStrengths {
  // κ: within/between-team variance ratio. Default chosen so a team needs
  // roughly this many matches before its raw estimate starts to dominate
  // the league-average prior — refit from the actual spread of team
  // ratings (league_ratings.rating_variance) once enough settled history
  // exists (methodology.md §8.1); this is a documented starting default,
  // not a claim of having been empirically calibrated yet.
  const { kappa = 8 } = options;

  const raw = fitTeamStrengths(matches, options);
  const sampleSize = countMatchesPerTeam(matches);

  const leagueAttackMean = average(Object.values(raw.attack));
  const leagueDefenceMean = average(Object.values(raw.defence));

  const attack: Record<string, number> = {};
  const defence: Record<string, number> = {};
  const shrinkageWeight: Record<string, number> = {};

  for (const teamId of Object.keys(raw.attack)) {
    const n = sampleSize[teamId] ?? 0;
    const attackResult = shrinkEstimate(raw.attack[teamId], n, leagueAttackMean, kappa);
    const defenceResult = shrinkEstimate(raw.defence[teamId], n, leagueDefenceMean, kappa);
    attack[teamId] = attackResult.shrunkMean;
    defence[teamId] = defenceResult.shrunkMean;
    shrinkageWeight[teamId] = attackResult.weight;
  }

  return { attack, defence, homeAdvantage: raw.homeAdvantage, sampleSize, shrinkageWeight };
}
