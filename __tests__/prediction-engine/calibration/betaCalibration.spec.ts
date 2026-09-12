import { describe, it, expect } from "vitest";
import {
  fitBetaCalibration,
  applyBetaCalibration,
} from "@/lib/prediction-engine/calibration/betaCalibration";
import { expectedCalibrationError } from "@/lib/prediction-engine/calibration/ece";

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
function logit(p: number): number {
  return Math.log(p / (1 - p));
}

describe("Beta calibration", () => {
  it("reduces ECE for an overconfident model, like Platt scaling does", () => {
    const reportedPs = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9];
    const predictions: { p: number; outcome: 0 | 1 }[] = [];
    for (const p of reportedPs) {
      const trueRate = sigmoid(0.5 * logit(p));
      const hits = Math.round(trueRate * 100);
      for (let i = 0; i < 100; i++) {
        predictions.push({ p, outcome: (i < hits ? 1 : 0) as 0 | 1 });
      }
    }

    const params = fitBetaCalibration(predictions);
    const rawEce = expectedCalibrationError(predictions).ece;
    const calibrated = predictions.map((p) => ({
      p: applyBetaCalibration(p.p, params),
      outcome: p.outcome,
    }));
    const calibratedEce = expectedCalibrationError(calibrated).ece;

    expect(calibratedEce).toBeLessThan(rawEce * 0.5);
  });

  it("handles an asymmetric (skewed) miscalibration that a symmetric Platt fit would fit less precisely", () => {
    // True rate compresses low probabilities much more than high ones —
    // an asymmetric distortion beta calibration's 2-df log(p)/log(1-p)
    // form can capture but a 1-df Platt scale/shift cannot as precisely.
    const reportedPs = [0.05, 0.1, 0.2, 0.5, 0.8, 0.9, 0.95];
    const predictions: { p: number; outcome: 0 | 1 }[] = [];
    for (const p of reportedPs) {
      const trueRate = p < 0.5 ? p * 0.3 : p; // only compress the low end
      const hits = Math.round(trueRate * 100);
      for (let i = 0; i < 100; i++) {
        predictions.push({ p, outcome: (i < hits ? 1 : 0) as 0 | 1 });
      }
    }

    const params = fitBetaCalibration(predictions);
    const rawEce = expectedCalibrationError(predictions).ece;
    const calibrated = predictions.map((p) => ({
      p: applyBetaCalibration(p.p, params),
      outcome: p.outcome,
    }));
    const calibratedEce = expectedCalibrationError(calibrated).ece;

    expect(calibratedEce).toBeLessThan(rawEce);
  });
});
