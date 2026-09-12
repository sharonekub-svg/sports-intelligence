import { describe, it, expect } from "vitest";
import { computeEdge, expectedValue } from "@/lib/prediction-engine/scoring/edge";

describe("edge helpers", () => {
  it("computeEdge is the simple difference", () => {
    expect(computeEdge(0.55, 0.48)).toBeCloseTo(0.07, 10);
  });

  it("expectedValue matches p·d − 1", () => {
    expect(expectedValue(0.55, 2.0)).toBeCloseTo(0.1, 10);
  });

  it("expectedValue is 0 at the break-even price (p = 1/d)", () => {
    expect(expectedValue(0.5, 2.0)).toBeCloseTo(0, 10);
  });
});
