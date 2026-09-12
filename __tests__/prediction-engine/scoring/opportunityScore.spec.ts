import { describe, it, expect } from "vitest";
import {
  standardErrorOfEdge,
  opportunityScore,
} from "@/lib/prediction-engine/scoring/opportunityScore";

describe("standardErrorOfEdge", () => {
  it("shrinks as sample size grows", () => {
    const small = standardErrorOfEdge(0.5, 20);
    const large = standardErrorOfEdge(0.5, 2000);
    expect(large).toBeLessThan(small);
  });

  it("grows with added market volatility", () => {
    const noVol = standardErrorOfEdge(0.5, 100, 0);
    const withVol = standardErrorOfEdge(0.5, 100, 0.05);
    expect(withVol).toBeGreaterThan(noVol);
  });
});

describe("opportunityScore — the anti-pattern check", () => {
  it("penalizes a small-sample longshot edge relative to a well-sampled equal-size edge", () => {
    // Same raw edge (0.10), but one comes from a small-sample, skewed
    // longshot market and the other from a large, near-even sample.
    const edge = 0.1;
    const longshotSe = standardErrorOfEdge(0.08, 30); // small n, extreme p
    const wellSampledSe = standardErrorOfEdge(0.5, 2000); // large n, central p

    const longshotScore = opportunityScore(edge, longshotSe);
    const wellSampledScore = opportunityScore(edge, wellSampledSe);

    // The raw-gap anti-pattern (methodology.md §12.4) would rank these
    // identically since |model-market| is the same; risk-adjusting must
    // not.
    expect(wellSampledScore).toBeGreaterThan(longshotScore);
  });

  it("rejects a non-positive standard error", () => {
    expect(() => opportunityScore(0.1, 0)).toThrow();
  });
});
