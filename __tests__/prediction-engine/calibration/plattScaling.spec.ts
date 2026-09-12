import { describe, it, expect } from "vitest";
import { fitPlattScaling, applyPlattScaling } from "@/lib/prediction-engine/calibration/plattScaling";
import { expectedCalibrationError } from "@/lib/prediction-engine/calibration/ece";

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
function logit(p: number): number {
  return Math.log(p / (1 - p));
}

/**
 * Deterministic synthetic "overconfident model": reported probabilities are
 * systematically too extreme — the true outcome rate at each reported p is
 * sigmoid(0.5 · logit(p)), i.e. compressed halfway back toward 0.5. Platt
 * scaling should recover something close to a≈0.5 and visibly reduce ECE.
 */
function buildOverconfidentPredictions() {
  const reportedPs = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9];
  const predictions: { p: number; outcome: 0 | 1 }[] = [];
  for (const p of reportedPs) {
    const trueRate = sigmoid(0.5 * logit(p));
    const hits = Math.round(trueRate * 100);
    for (let i = 0; i < 100; i++) {
      predictions.push({ p, outcome: (i < hits ? 1 : 0) as 0 | 1 });
    }
  }
  return predictions;
}

describe("Platt scaling", () => {
  it("recovers a compression factor well below 1 for an overconfident model", () => {
    const predictions = buildOverconfidentPredictions();
    const { a } = fitPlattScaling(predictions);
    expect(a).toBeGreaterThan(0.2);
    expect(a).toBeLessThan(0.8);
  });

  it("reduces ECE relative to the uncorrected raw probabilities", () => {
    const predictions = buildOverconfidentPredictions();
    const params = fitPlattScaling(predictions);

    const rawEce = expectedCalibrationError(predictions).ece;
    const calibrated = predictions.map((p) => ({
      p: applyPlattScaling(p.p, params),
      outcome: p.outcome,
    }));
    const calibratedEce = expectedCalibrationError(calibrated).ece;

    expect(calibratedEce).toBeLessThan(rawEce * 0.5);
  });

  it("leaves an already-calibrated model close to unchanged", () => {
    const reportedPs = [0.2, 0.4, 0.6, 0.8];
    const predictions: { p: number; outcome: 0 | 1 }[] = [];
    for (const p of reportedPs) {
      const hits = Math.round(p * 100);
      for (let i = 0; i < 100; i++) {
        predictions.push({ p, outcome: (i < hits ? 1 : 0) as 0 | 1 });
      }
    }
    const { a, b } = fitPlattScaling(predictions);
    expect(a).toBeCloseTo(1, 0); // within ±0.5
    expect(b).toBeCloseTo(0, 0); // within ±0.5
  });
});
