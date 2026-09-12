import { describe, it, expect } from "vitest";
import { noVigProbability, overround } from "@/lib/prediction-engine/devig/proportional";

describe("proportional de-vig", () => {
  it("matches the textbook example (Evens/2-1/5-1 book with 20% overround)", () => {
    // Fair probabilities 50%/33.3%/16.7% (ratio 3:2:1) quoted at reduced
    // odds 4-6/6-4/4-1 => decimal 1.6667/2.5/5 => implied 60%/40%/20% = 120%.
    const decimalOdds = [1 / 0.6, 1 / 0.4, 1 / 0.2];
    expect(overround(decimalOdds)).toBeCloseTo(0.2, 10);

    const probs = noVigProbability(decimalOdds);
    expect(probs[0]).toBeCloseTo(0.5, 10);
    expect(probs[1]).toBeCloseTo(1 / 3, 10);
    expect(probs[2]).toBeCloseTo(1 / 6, 10);
  });

  it("always sums to 1", () => {
    const probs = noVigProbability([1.9, 3.6, 4.2]);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("overround is 0 for a perfectly fair (no-margin) book", () => {
    expect(overround([2, 2])).toBeCloseTo(0, 10);
  });

  it("throws on empty input", () => {
    expect(() => noVigProbability([])).toThrow();
    expect(() => overround([])).toThrow();
  });
});
