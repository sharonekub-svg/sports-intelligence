import type { PredictionOutcome } from "./brier";

/**
 * Expected / Maximum Calibration Error — methodology.md §6.4.
 *
 *   ECE = Σ_m (|B_m|/N) · |acc(B_m) − conf(B_m)|
 *   MCE = max_m |acc(B_m) − conf(B_m)|
 */

export interface ReliabilityBin {
  binStart: number;
  binEnd: number;
  count: number;
  meanForecast: number | null;
  observedRate: number | null;
}

export interface CalibrationError {
  ece: number;
  mce: number;
  reliabilityBins: ReliabilityBin[];
}

export function expectedCalibrationError(
  predictions: PredictionOutcome[],
  bins = 10
): CalibrationError {
  if (predictions.length === 0) throw new Error("predictions must be non-empty");

  const n = predictions.length;
  const buckets: PredictionOutcome[][] = Array.from({ length: bins }, () => []);
  for (const pred of predictions) {
    const idx = Math.min(bins - 1, Math.floor(pred.p * bins));
    buckets[idx].push(pred);
  }

  let ece = 0;
  let mce = 0;
  const reliabilityBins: ReliabilityBin[] = buckets.map((bucket, i) => {
    const binStart = i / bins;
    const binEnd = (i + 1) / bins;
    if (bucket.length === 0) {
      return { binStart, binEnd, count: 0, meanForecast: null, observedRate: null };
    }
    const meanForecast = bucket.reduce((s, p) => s + p.p, 0) / bucket.length;
    const observedRate = bucket.reduce((s, p) => s + p.outcome, 0) / bucket.length;
    const gap = Math.abs(observedRate - meanForecast);

    ece += (bucket.length / n) * gap;
    mce = Math.max(mce, gap);

    return { binStart, binEnd, count: bucket.length, meanForecast, observedRate };
  });

  return { ece, mce, reliabilityBins };
}
