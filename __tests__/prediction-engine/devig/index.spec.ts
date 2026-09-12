import { describe, it, expect } from "vitest";
import { deVig } from "@/lib/prediction-engine/devig";

describe("deVig method selection", () => {
  it("uses proportional for a near-even two-way market", () => {
    const result = deVig([1.9, 1.95]);
    expect(result.method).toBe("proportional");
    expect(result.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });

  it("uses shin for a skewed multi-way market", () => {
    const result = deVig([1.9, 3.6, 15]);
    expect(result.method).toBe("shin");
    expect(result.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("uses shin for a skewed two-way market", () => {
    const result = deVig([1.05, 15]);
    expect(result.method).toBe("shin");
  });

  it("reports the overround regardless of method chosen", () => {
    const result = deVig([1.9, 3.6, 4.2]);
    expect(result.overround).toBeGreaterThan(0);
  });

  it("rejects a single-outcome market", () => {
    expect(() => deVig([1.9])).toThrow();
  });
});
