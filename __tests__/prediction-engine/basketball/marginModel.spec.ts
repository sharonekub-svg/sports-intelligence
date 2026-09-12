import { describe, it, expect } from "vitest";
import {
  normalCdf,
  projectedMargin,
  winProbability,
} from "@/lib/prediction-engine/basketball/marginModel";

describe("normalCdf", () => {
  it("is 0.5 at the mean", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it("matches the standard 1.96σ ⇒ 97.5th percentile reference point", () => {
    expect(normalCdf(1.959963984540054)).toBeCloseTo(0.975, 4);
  });

  it("matches erf(1) ⇒ Φ(√2) reference point", () => {
    // Φ(x) = 0.5(1+erf(x/√2)); erf(1) ≈ 0.842701 ⇒ Φ(√2) ≈ 0.921350
    expect(normalCdf(Math.SQRT2)).toBeCloseTo(0.921350, 4);
  });

  it("is symmetric around the mean", () => {
    expect(normalCdf(5, 10, 3) + normalCdf(15, 10, 3)).toBeCloseTo(1, 6);
  });
});

describe("projectedMargin + winProbability", () => {
  it("a zero net-efficiency, no home edge matchup gives 50/50", () => {
    const margin = projectedMargin(0, 100, 0);
    expect(margin).toBe(0);
    expect(winProbability(margin, 12)).toBeCloseTo(0.5, 6);
  });

  it("home-court edge alone tilts the probability above 50%", () => {
    const margin = projectedMargin(0, 100, 3);
    expect(winProbability(margin, 12)).toBeGreaterThan(0.5);
  });

  it("a larger efficiency gap produces a more extreme win probability", () => {
    const smallGap = winProbability(projectedMargin(2, 100, 0), 12);
    const largeGap = winProbability(projectedMargin(10, 100, 0), 12);
    expect(largeGap).toBeGreaterThan(smallGap);
  });
});
