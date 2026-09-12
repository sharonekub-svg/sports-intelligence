/**
 * Empirical-Bayes / James-Stein-style shrinkage — methodology.md §8.1.
 *
 * The PRINCIPLED small-league/small-sample penalty: pull a team's raw
 * estimate toward a league-level prior, weighted by how much data backs
 * it — never a hardcoded "small league" multiplier.
 *
 *   weight = n / (n + κ)
 *   shrunkMean = weight · sampleMean + (1 − weight) · priorMean
 *
 * κ (kappa) is the ratio of within-team to between-team variance — in
 * practice, fit it from the spread of team estimates within a league
 * (league_ratings.rating_variance) once enough settled history exists.
 * Until then, callers pass a documented default (see teamStrength.ts).
 */

export interface ShrinkageResult {
  shrunkMean: number;
  weight: number;
}

export function shrinkEstimate(
  sampleMean: number,
  sampleSize: number,
  priorMean: number,
  kappa: number
): ShrinkageResult {
  if (sampleSize < 0) throw new Error("sampleSize must be non-negative");
  if (kappa <= 0) throw new Error("kappa must be positive");

  const weight = sampleSize / (sampleSize + kappa);
  const shrunkMean = weight * sampleMean + (1 - weight) * priorMean;

  return { shrunkMean, weight };
}

/**
 * Effective sample size accounting for within-cluster correlation
 * (methodology.md §5) — e.g. repeated meetings of the same two clubs are
 * not independent observations.
 *
 *   ESS = n / (1 + (n-1)·ρ)
 */
export function effectiveSampleSize(n: number, correlation: number): number {
  if (n < 0) throw new Error("n must be non-negative");
  if (correlation < 0 || correlation >= 1) {
    throw new Error("correlation must be in [0, 1)");
  }
  return n / (1 + (n - 1) * correlation);
}
