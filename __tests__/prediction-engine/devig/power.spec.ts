import { describe, it, expect } from "vitest";
import { powerDevig } from "@/lib/prediction-engine/devig/power";

describe("power de-vig", () => {
  it("sums to 1 and finds k > 1 for an over-round book", () => {
    const { probs, k } = powerDevig([1.9, 3.6, 4.2]);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    expect(k).toBeGreaterThan(1);
  });

  it("preserves the favorite/underdog ranking", () => {
    const { probs } = powerDevig([1.5, 4.0, 8.0]);
    expect(probs[0]).toBeGreaterThan(probs[1]);
    expect(probs[1]).toBeGreaterThan(probs[2]);
  });

  it("finds k ≈ 1 for a book with negligible overround", () => {
    const { k } = powerDevig([2.0002, 2.0002]);
    expect(k).toBeCloseTo(1, 1);
  });

  it("shrinks a longshot relative to proportional de-vig", () => {
    // With a skewed book, the power method's k>1 should pull the longshot's
    // probability below what naive proportional de-vig would assign it.
    const prices = [1.05, 15];
    const proportionalLongshot = (1 / 15) / (1 / 1.05 + 1 / 15);
    const { probs } = powerDevig(prices);
    expect(probs[1]).toBeLessThan(proportionalLongshot);
  });
});
