import { describe, it, expect } from "vitest";
import { expectedScore, updateRatings } from "@/lib/prediction-engine/elo/elo";

describe("Elo expectedScore", () => {
  it("is 0.5 for equal ratings with no home advantage", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
  });

  it("matches the classic 400-point ⇒ ~ 10x odds reference point", () => {
    // A 400-point gap gives the stronger player E ≈ 0.909091 (10/11).
    expect(expectedScore(1900, 1500)).toBeCloseTo(10 / 11, 5);
  });

  it("is symmetric: E_A(a,b) + E_B(b,a) = 1", () => {
    const eA = expectedScore(1600, 1450);
    const eB = expectedScore(1450, 1600);
    expect(eA + eB).toBeCloseTo(1, 10);
  });

  it("home advantage shifts the expected score in the home team's favor", () => {
    const withoutHome = expectedScore(1500, 1500, 0);
    const withHome = expectedScore(1500, 1500, 60);
    expect(withHome).toBeGreaterThan(withoutHome);
  });
});

describe("Elo updateRatings", () => {
  it("conserves total rating (zero-sum)", () => {
    const { newRatingA, newRatingB } = updateRatings(1500, 1500, 1, 32);
    expect(newRatingA + newRatingB).toBeCloseTo(3000, 8);
  });

  it("rewards an upset (underdog win) with a bigger swing than a expected win", () => {
    const upset = updateRatings(1400, 1700, 1, 32);
    const expectedWin = updateRatings(1700, 1400, 1, 32);
    const upsetGain = upset.newRatingA - 1400;
    const expectedGain = expectedWin.newRatingA - 1700;
    expect(upsetGain).toBeGreaterThan(expectedGain);
  });

  it("a draw between equals leaves ratings unchanged", () => {
    const { newRatingA, newRatingB } = updateRatings(1500, 1500, 0.5, 32);
    expect(newRatingA).toBeCloseTo(1500, 10);
    expect(newRatingB).toBeCloseTo(1500, 10);
  });

  it("rejects an invalid actual score", () => {
    expect(() => updateRatings(1500, 1500, 1.5, 32)).toThrow();
  });
});
