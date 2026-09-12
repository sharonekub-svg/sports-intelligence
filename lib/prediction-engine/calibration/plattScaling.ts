import type { PredictionOutcome } from "./brier";

/**
 * Platt scaling — methodology.md §6.5. Default calibration correction for
 * limited data: a 2-parameter logistic fit on the log-odds of the raw
 * probability.
 *
 *   p' = sigmoid(a · logit(p) + b)
 *
 * Fit by plain batch gradient descent on the log-loss (this is a convex
 * 2-parameter problem — no need for a numerical-optimization dependency).
 * Always fit on a held-out split from whatever produced the raw
 * probabilities, per methodology.md §6.5 — this module has no opinion on
 * that split, it just fits/applies the transform.
 */

export interface PlattParams {
  a: number;
  b: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function logit(p: number, floor = 1e-7): number {
  const clipped = Math.min(1 - floor, Math.max(floor, p));
  return Math.log(clipped / (1 - clipped));
}

export function fitPlattScaling(
  predictions: PredictionOutcome[],
  options: { iterations?: number; learningRate?: number } = {}
): PlattParams {
  if (predictions.length === 0) throw new Error("predictions must be non-empty");
  const { iterations = 2000, learningRate = 0.3 } = options;

  const x = predictions.map((p) => logit(p.p));
  const y = predictions.map((p) => p.outcome);
  const n = x.length;

  // Start at the identity transform (a=1, b=0 ⇒ p' = p).
  let a = 1;
  let b = 0;

  for (let iter = 0; iter < iterations; iter++) {
    let gradA = 0;
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      const pred = sigmoid(a * x[i] + b);
      const error = pred - y[i];
      gradA += error * x[i];
      gradB += error;
    }
    a -= (learningRate * gradA) / n;
    b -= (learningRate * gradB) / n;
  }

  return { a, b };
}

export function applyPlattScaling(p: number, params: PlattParams): number {
  return sigmoid(params.a * logit(p) + params.b);
}
