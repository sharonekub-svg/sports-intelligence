import type { PredictionOutcome } from "./brier";

/**
 * Log loss (negative log-likelihood) — methodology.md §6.2. Strictly
 * proper scoring rule; punishes confident-and-wrong predictions far more
 * harshly than Brier does, because it is unbounded as p→0 for an outcome
 * that occurs.
 *
 *   Log Loss = −(1/N) Σ ln(p_i)   [p_i = probability assigned to the
 *                                  outcome that actually occurred]
 *
 * Probabilities are clipped to [floor, 1−floor] before taking the log, so
 * a single p=0 (or p=1) prediction never produces +Infinity and silently
 * poisons an aggregate.
 */
export function logLoss(
  predictions: PredictionOutcome[],
  floor = 1e-7
): number {
  if (predictions.length === 0) throw new Error("predictions must be non-empty");

  const clip = (p: number) => Math.min(1 - floor, Math.max(floor, p));

  const total = predictions.reduce((sum, { p, outcome }) => {
    const pClipped = clip(p);
    // ln(p) if the class occurred, ln(1-p) if it didn't — this is the
    // standard binary cross-entropy term for one forecast/outcome pair.
    const term = outcome === 1 ? Math.log(pClipped) : Math.log(1 - pClipped);
    return sum + term;
  }, 0);

  return -total / predictions.length;
}
