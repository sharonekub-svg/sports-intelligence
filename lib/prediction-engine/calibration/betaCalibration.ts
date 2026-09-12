import type { PredictionOutcome } from "./brier";

/**
 * Beta calibration (Kull, Silva Filho & Flach, 2017) — methodology.md §6.5.
 * Used instead of Platt scaling when the raw probability distribution is
 * skewed (e.g. Naive-Bayes-style scores); contains the identity and the
 * logistic curve as special cases, so it can't "uncalibrate" an
 * already-well-calibrated input.
 *
 *   logit(p') = a·ln(p) + b·ln(1−p) + c
 *
 * This is a 3-parameter logistic regression on (ln p, ln(1−p)) — fit by
 * the same batch gradient descent as Platt scaling, just with one more
 * coefficient.
 */

export interface BetaCalibrationParams {
  a: number;
  b: number;
  c: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clip(p: number, floor = 1e-7): number {
  return Math.min(1 - floor, Math.max(floor, p));
}

export function fitBetaCalibration(
  predictions: PredictionOutcome[],
  options: { iterations?: number; learningRate?: number } = {}
): BetaCalibrationParams {
  if (predictions.length === 0) throw new Error("predictions must be non-empty");
  const { iterations = 2000, learningRate = 0.3 } = options;

  const lnP = predictions.map((p) => Math.log(clip(p.p)));
  const ln1MinusP = predictions.map((p) => Math.log(1 - clip(p.p)));
  const y = predictions.map((p) => p.outcome);
  const n = predictions.length;

  // a=1, b=-1, c=0 ⇒ logit(p') = ln(p) - ln(1-p) = logit(p) ⇒ identity start.
  let a = 1;
  let b = -1;
  let c = 0;

  for (let iter = 0; iter < iterations; iter++) {
    let gradA = 0;
    let gradB = 0;
    let gradC = 0;
    for (let i = 0; i < n; i++) {
      const pred = sigmoid(a * lnP[i] + b * ln1MinusP[i] + c);
      const error = pred - y[i];
      gradA += error * lnP[i];
      gradB += error * ln1MinusP[i];
      gradC += error;
    }
    a -= (learningRate * gradA) / n;
    b -= (learningRate * gradB) / n;
    c -= (learningRate * gradC) / n;
  }

  return { a, b, c };
}

export function applyBetaCalibration(p: number, params: BetaCalibrationParams): number {
  const pClipped = clip(p);
  const logit =
    params.a * Math.log(pClipped) + params.b * Math.log(1 - pClipped) + params.c;
  return sigmoid(logit);
}
