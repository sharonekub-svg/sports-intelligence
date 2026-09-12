import { describe, it, expect } from "vitest";
import { brierScore, brierSkillScore } from "@/lib/prediction-engine/calibration/brier";

describe("brierScore", () => {
  it("matches a hand-computed example", () => {
    const predictions = [
      { p: 0.7, outcome: 1 as const },
      { p: 0.7, outcome: 0 as const },
      { p: 0.3, outcome: 0 as const },
    ];
    // ((0.7-1)² + (0.7-0)² + (0.3-0)²) / 3 = (0.09+0.49+0.09)/3
    expect(brierScore(predictions)).toBeCloseTo(0.223333, 5);
  });

  it("is 0 for perfect, fully-confident predictions", () => {
    const predictions = [
      { p: 1, outcome: 1 as const },
      { p: 0, outcome: 0 as const },
    ];
    expect(brierScore(predictions)).toBe(0);
  });

  it("is 1 for maximally wrong, fully-confident predictions", () => {
    const predictions = [{ p: 1, outcome: 0 as const }];
    expect(brierScore(predictions)).toBe(1);
  });

  it("brierSkillScore is 0 when the model just predicts the base rate", () => {
    const baseRate = 0.3;
    const predictions = Array.from({ length: 100 }, (_, i) => ({
      p: baseRate,
      outcome: (i < 30 ? 1 : 0) as 0 | 1,
    }));
    expect(brierSkillScore(predictions, baseRate)).toBeCloseTo(0, 5);
  });
});
