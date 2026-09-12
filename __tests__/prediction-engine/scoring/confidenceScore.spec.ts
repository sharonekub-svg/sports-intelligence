import { describe, it, expect } from "vitest";
import { confidenceScore } from "@/lib/prediction-engine/scoring/confidenceScore";

describe("confidenceScore", () => {
  it("is 1 for a perfectly-calibrated, zero-uncertainty estimate", () => {
    const { score } = confidenceScore(0, 0);
    expect(score).toBeCloseTo(1, 10);
  });

  it("is 0 when both calibration and uncertainty are maximally bad", () => {
    const { score } = confidenceScore(1, 1);
    expect(score).toBeCloseTo(0, 10);
  });

  it("decreases monotonically as either penalty grows", () => {
    const base = confidenceScore(0.1, 0.1).score;
    const worseCalibration = confidenceScore(0.5, 0.1).score;
    const worseUncertainty = confidenceScore(0.1, 0.5).score;
    expect(worseCalibration).toBeLessThan(base);
    expect(worseUncertainty).toBeLessThan(base);
  });

  it("is a different quantity from Opportunity Score by construction (no edge/EV input at all)", () => {
    const { components } = confidenceScore(0.2, 0.3);
    expect(components).toHaveProperty("calibrationPenalty");
    expect(components).toHaveProperty("uncertaintyPenalty");
  });

  it("clamps out-of-range inputs rather than producing a negative score", () => {
    const { score } = confidenceScore(2, 2);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
