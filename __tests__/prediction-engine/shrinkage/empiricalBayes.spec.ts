import { describe, it, expect } from "vitest";
import {
  shrinkEstimate,
  effectiveSampleSize,
} from "@/lib/prediction-engine/shrinkage/empiricalBayes";

describe("shrinkEstimate", () => {
  it("weight approaches 1 (trust the data) as n grows", () => {
    const { weight } = shrinkEstimate(10, 1000, 0.5, 10);
    expect(weight).toBeGreaterThan(0.99);
  });

  it("weight approaches 0 (trust the prior) as n shrinks toward 0", () => {
    const { weight } = shrinkEstimate(10, 0.001, 0.5, 10);
    expect(weight).toBeLessThan(0.01);
  });

  it("weight is exactly 0.5 when n equals kappa", () => {
    const { weight } = shrinkEstimate(1.8, 10, 1.5, 10);
    expect(weight).toBeCloseTo(0.5, 10);
  });

  it("a small-sample team is pulled toward the league prior, not left at its noisy raw value", () => {
    // A newly-promoted team with 3 matches showing an inflated rating.
    const { shrunkMean } = shrinkEstimate(2.5, 3, 1.0, 15);
    expect(shrunkMean).toBeGreaterThan(1.0); // pulled up from the prior...
    expect(shrunkMean).toBeLessThan(2.5); // ...but nowhere near the raw noisy value
  });

  it("a well-established team's estimate is barely shrunk", () => {
    const { shrunkMean } = shrinkEstimate(1.8, 500, 1.0, 15);
    expect(shrunkMean).toBeCloseTo(1.8, 1);
  });

  it("rejects a non-positive kappa", () => {
    expect(() => shrinkEstimate(1, 10, 1, 0)).toThrow();
  });
});

describe("effectiveSampleSize", () => {
  it("equals n when observations are independent (ρ=0)", () => {
    expect(effectiveSampleSize(20, 0)).toBe(20);
  });

  it("is less than n when observations are correlated", () => {
    expect(effectiveSampleSize(20, 0.5)).toBeLessThan(20);
  });
});
