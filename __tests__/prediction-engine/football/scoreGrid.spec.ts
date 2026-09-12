import { describe, it, expect } from "vitest";
import { buildScoreGrid, toMarketProbabilities } from "@/lib/prediction-engine/football/scoreGrid";

describe("buildScoreGrid", () => {
  it("sums to 1 across the whole grid", () => {
    const grid = buildScoreGrid(1.4, 1.1, -0.1);
    const total = grid.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
    expect(total).toBeCloseTo(1, 8);
  });

  it("still sums to 1 with rho=0 (independent Poisson, no adjustment needed)", () => {
    const grid = buildScoreGrid(1.4, 1.1, 0);
    const total = grid.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("toMarketProbabilities", () => {
  it("1X2 probabilities sum to 1", () => {
    const grid = buildScoreGrid(1.4, 1.1, -0.1);
    const { oneXTwo } = toMarketProbabilities(grid);
    expect(oneXTwo.home + oneXTwo.draw + oneXTwo.away).toBeCloseTo(1, 8);
  });

  it("a stronger home λ implies a higher home-win probability than away-win", () => {
    const grid = buildScoreGrid(2.2, 0.9, -0.1);
    const { oneXTwo } = toMarketProbabilities(grid);
    expect(oneXTwo.home).toBeGreaterThan(oneXTwo.away);
  });

  it("over/under lines for the same total are complementary", () => {
    const grid = buildScoreGrid(1.4, 1.1, -0.1);
    const { totals } = toMarketProbabilities(grid);
    expect(totals["over_2.5"] + totals["under_2.5"]).toBeCloseTo(1, 8);
  });

  it("over probability decreases monotonically as the line rises", () => {
    const grid = buildScoreGrid(1.4, 1.1, -0.1);
    const { totals } = toMarketProbabilities(grid);
    expect(totals["over_0.5"]).toBeGreaterThan(totals["over_1.5"]);
    expect(totals["over_1.5"]).toBeGreaterThan(totals["over_2.5"]);
    expect(totals["over_2.5"]).toBeGreaterThan(totals["over_3.5"]);
  });

  it("correct-score probabilities sum to (approximately) the same total as 1X2", () => {
    const grid = buildScoreGrid(1.4, 1.1, -0.1);
    const { correctScore, oneXTwo } = toMarketProbabilities(grid);
    const sumScores = Object.values(correctScore).reduce((a, b) => a + b, 0);
    expect(sumScores).toBeCloseTo(oneXTwo.home + oneXTwo.draw + oneXTwo.away, 8);
  });
});
