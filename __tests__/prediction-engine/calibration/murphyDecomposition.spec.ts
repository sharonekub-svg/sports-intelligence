import { describe, it, expect } from "vitest";
import { murphyDecomposition } from "@/lib/prediction-engine/calibration/murphyDecomposition";
import { brierScore } from "@/lib/prediction-engine/calibration/brier";

function buildPredictions() {
  // Two perfectly-calibrated buckets: p=0.2 with 1/5 hits, p=0.8 with 4/5
  // hits — REL should be exactly 0 (forecast matches observed rate in
  // both buckets), RES > 0 (buckets differ from the 0.5 overall rate).
  const bucketLow = Array.from({ length: 5 }, (_, i) => ({
    p: 0.2,
    outcome: (i === 0 ? 1 : 0) as 0 | 1,
  }));
  const bucketHigh = Array.from({ length: 5 }, (_, i) => ({
    p: 0.8,
    outcome: (i < 4 ? 1 : 0) as 0 | 1,
  }));
  return [...bucketLow, ...bucketHigh];
}

describe("murphyDecomposition", () => {
  it("REL=0 for perfectly-calibrated buckets, and BS = REL - RES + UNC", () => {
    const predictions = buildPredictions();
    const { reliability, resolution, uncertainty, brierScore: bs } =
      murphyDecomposition(predictions, 10);

    expect(reliability).toBeCloseTo(0, 10);
    expect(resolution).toBeCloseTo(0.09, 10);
    expect(uncertainty).toBeCloseTo(0.25, 10);
    expect(bs).toBeCloseTo(reliability - resolution + uncertainty, 10);
    expect(bs).toBeCloseTo(brierScore(predictions), 10);
  });

  it("reliability increases when forecasts drift from observed frequency", () => {
    const good = murphyDecomposition(buildPredictions());
    const miscalibrated = buildPredictions().map((p) => ({
      ...p,
      p: p.p === 0.2 ? 0.05 : 0.95, // same ranking, worse calibration
    }));
    const bad = murphyDecomposition(miscalibrated);
    expect(bad.reliability).toBeGreaterThan(good.reliability);
  });
});
