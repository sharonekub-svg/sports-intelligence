import { describe, it, expect } from "vitest";
import { pythagoreanWinExpectation } from "@/lib/prediction-engine/basketball/pythagorean";

describe("pythagoreanWinExpectation", () => {
  it("is 0.5 when points for equals points against", () => {
    expect(pythagoreanWinExpectation(100, 100)).toBeCloseTo(0.5, 10);
  });

  it("favors the team that outscores its opponents", () => {
    expect(pythagoreanWinExpectation(110, 100)).toBeGreaterThan(0.5);
    expect(pythagoreanWinExpectation(100, 110)).toBeLessThan(0.5);
  });

  it("is symmetric: swapping for/against gives the complementary probability", () => {
    const a = pythagoreanWinExpectation(112, 105);
    const b = pythagoreanWinExpectation(105, 112);
    expect(a + b).toBeCloseTo(1, 10);
  });

  it("rejects non-positive inputs", () => {
    expect(() => pythagoreanWinExpectation(0, 100)).toThrow();
    expect(() => pythagoreanWinExpectation(100, -5)).toThrow();
  });
});
