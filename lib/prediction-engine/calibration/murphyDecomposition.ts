import type { PredictionOutcome } from "./brier";

/**
 * Murphy (1973) decomposition of the Brier score — methodology.md §6.3.
 *
 *   BS = REL − RES + UNC
 *
 * - REL (reliability): (1/N) Σ_k n_k(f_k − ō_k)²  — miscalibration; lower
 *   is better, 0 = perfectly calibrated.
 * - RES (resolution): (1/N) Σ_k n_k(ō_k − ō)²  — discrimination beyond
 *   the base rate; higher is better.
 * - UNC (uncertainty): ō(1−ō)  — the sport's irreducible floor.
 *
 * Predictions are grouped into `bins` equal-width probability buckets
 * (methodology.md notes ECE is sensitive to binning choice — the same
 * caveat applies here).
 */

export interface MurphyDecomposition {
  reliability: number;
  resolution: number;
  uncertainty: number;
  brierScore: number;
}

export function murphyDecomposition(
  predictions: PredictionOutcome[],
  bins = 10
): MurphyDecomposition {
  if (predictions.length === 0) throw new Error("predictions must be non-empty");

  const n = predictions.length;
  const overallRate = predictions.reduce((s, p) => s + p.outcome, 0) / n;

  const buckets: PredictionOutcome[][] = Array.from({ length: bins }, () => []);
  for (const pred of predictions) {
    const idx = Math.min(bins - 1, Math.floor(pred.p * bins));
    buckets[idx].push(pred);
  }

  let reliability = 0;
  let resolution = 0;

  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    const nk = bucket.length;
    const meanForecast = bucket.reduce((s, p) => s + p.p, 0) / nk;
    const observedRate = bucket.reduce((s, p) => s + p.outcome, 0) / nk;

    reliability += nk * (meanForecast - observedRate) ** 2;
    resolution += nk * (observedRate - overallRate) ** 2;
  }

  reliability /= n;
  resolution /= n;
  const uncertainty = overallRate * (1 - overallRate);

  return {
    reliability,
    resolution,
    uncertainty,
    brierScore: reliability - resolution + uncertainty,
  };
}
