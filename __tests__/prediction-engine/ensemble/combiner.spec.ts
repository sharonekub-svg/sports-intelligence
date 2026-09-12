import { describe, it, expect } from "vitest";
import { combineModels } from "@/lib/prediction-engine/ensemble/combiner";

describe("combineModels", () => {
  it("averages equally-weighted members", () => {
    const result = combineModels([
      { source: "elo", prob: 0.6 },
      { source: "poisson", prob: 0.7 },
    ]);
    expect(result).toBeCloseTo(0.65, 10);
  });

  it("weights a more-trusted member more heavily", () => {
    const result = combineModels([
      { source: "elo", prob: 0.5, weight: 1 },
      { source: "poisson", prob: 0.8, weight: 3 },
    ]);
    // (1*0.5 + 3*0.8) / 4 = 0.725
    expect(result).toBeCloseTo(0.725, 10);
  });

  it("a zero-weighted member has no effect", () => {
    const result = combineModels([
      { source: "elo", prob: 0.5, weight: 0 },
      { source: "poisson", prob: 0.9, weight: 1 },
    ]);
    expect(result).toBeCloseTo(0.9, 10);
  });

  it("rejects an empty ensemble", () => {
    expect(() => combineModels([])).toThrow();
  });
});
