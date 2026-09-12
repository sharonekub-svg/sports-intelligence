import { describe, it, expect } from "vitest";
import { wilsonInterval, isReliable } from "@/lib/prediction-engine/uncertainty/wilson";

describe("wilsonInterval", () => {
  it("matches the published reference example (n=200, p̂=0.30 → ≈[0.241, 0.367])", () => {
    const { low, high, pointEstimate } = wilsonInterval(60, 200);
    expect(pointEstimate).toBeCloseTo(0.3, 10);
    expect(low).toBeCloseTo(0.2407, 3);
    expect(high).toBeCloseTo(0.3668, 3);
  });

  it("narrows as n grows for the same proportion", () => {
    const small = wilsonInterval(30, 100);
    const large = wilsonInterval(300, 1000);
    expect(large.high - large.low).toBeLessThan(small.high - small.low);
  });

  it("stays within [0, 1] even at the boundary (successes=0)", () => {
    const { low, high } = wilsonInterval(0, 50);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
    expect(low).toBeCloseTo(0, 10);
  });

  it("stays within [0, 1] at the boundary (successes=n)", () => {
    const { high } = wilsonInterval(50, 50);
    expect(high).toBeLessThanOrEqual(1);
    expect(high).toBe(1);
  });

  it("rejects invalid inputs", () => {
    expect(() => wilsonInterval(5, 0)).toThrow();
    expect(() => wilsonInterval(-1, 10)).toThrow();
    expect(() => wilsonInterval(11, 10)).toThrow();
  });
});

describe("isReliable", () => {
  it("flags a small tail-market sample as unreliable", () => {
    // Over 4.5 goals at p≈0.05 with n=200 → n*p=10, below the 15 threshold.
    expect(isReliable(200, 0.05)).toBe(false);
  });

  it("accepts a well-sampled near-even market", () => {
    // A draw at p≈0.27 with n=500 → n*p≈135, n*(1-p)≈365.
    expect(isReliable(500, 0.27)).toBe(true);
  });
});
