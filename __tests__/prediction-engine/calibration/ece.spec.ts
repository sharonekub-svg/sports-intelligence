import { describe, it, expect } from "vitest";
import { expectedCalibrationError } from "@/lib/prediction-engine/calibration/ece";

describe("expectedCalibrationError", () => {
  it("is 0 for perfectly-calibrated buckets", () => {
    const bucketLow = Array.from({ length: 5 }, (_, i) => ({
      p: 0.2,
      outcome: (i === 0 ? 1 : 0) as 0 | 1,
    }));
    const bucketHigh = Array.from({ length: 5 }, (_, i) => ({
      p: 0.8,
      outcome: (i < 4 ? 1 : 0) as 0 | 1,
    }));
    const { ece, mce } = expectedCalibrationError([...bucketLow, ...bucketHigh], 10);
    expect(ece).toBeCloseTo(0, 10);
    expect(mce).toBeCloseTo(0, 10);
  });

  it("is positive and reports the worst bin via MCE for an overconfident model", () => {
    // Model always says 0.95 but is only right half the time.
    const predictions = Array.from({ length: 20 }, (_, i) => ({
      p: 0.95,
      outcome: (i < 10 ? 1 : 0) as 0 | 1,
    }));
    const { ece, mce } = expectedCalibrationError(predictions, 10);
    expect(ece).toBeGreaterThan(0.4);
    expect(mce).toBeCloseTo(ece, 10); // only one populated bin, so MCE = ECE
  });

  it("empty bins are reported with null forecast/observed, not NaN", () => {
    const { reliabilityBins } = expectedCalibrationError(
      [{ p: 0.05, outcome: 0 }],
      10
    );
    const emptyBin = reliabilityBins.find((b) => b.count === 0);
    expect(emptyBin?.meanForecast).toBeNull();
    expect(emptyBin?.observedRate).toBeNull();
  });
});
