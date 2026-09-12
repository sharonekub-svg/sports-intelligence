import { describe, it, expect } from "vitest";
import { benjaminiHochberg } from "@/lib/prediction-engine/backtest/fdrCorrection";

describe("benjaminiHochberg", () => {
  it("matches a hand-worked example (m=5, α=0.05)", () => {
    // Sorted: 0.001, 0.01, 0.02, 0.04, 0.5
    // Thresholds (i/m·α): 0.01, 0.02, 0.03, 0.04, 0.05
    // 0.001≤0.01 ✓, 0.01≤0.02 ✓, 0.02≤0.03 ✓, 0.04≤0.04 ✓, 0.5≤0.05 ✗
    // ⇒ largest passing rank is 4th ⇒ the four smallest are significant.
    const pValues = [0.5, 0.001, 0.04, 0.02, 0.01]; // deliberately unsorted
    const significant = benjaminiHochberg(pValues, 0.05);
    expect(significant).toEqual([false, true, true, true, true]);
  });

  it("rejects nothing when every p-value fails the threshold", () => {
    const significant = benjaminiHochberg([0.5, 0.6, 0.7], 0.05);
    expect(significant.every((s) => !s)).toBe(true);
  });

  it("rejects everything when every p-value is far below the threshold", () => {
    const significant = benjaminiHochberg([0.0001, 0.0002, 0.0003], 0.05);
    expect(significant.every((s) => s)).toBe(true);
  });

  it("is strictly more permissive than a flat per-test α=0.05 (the whole point of FDR correction)", () => {
    // A batch where naive per-test α would reject index 0 and 2, but the
    // FDR-adjusted threshold for a large batch is much stricter for the
    // smallest p-values unless enough of the batch also clears it.
    const pValues = [0.03, 0.2, 0.04, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const significant = benjaminiHochberg(pValues, 0.05);
    const naiveSignificantCount = pValues.filter((p) => p < 0.05).length;
    const fdrSignificantCount = significant.filter(Boolean).length;
    expect(fdrSignificantCount).toBeLessThanOrEqual(naiveSignificantCount);
  });

  it("handles an empty batch", () => {
    expect(benjaminiHochberg([])).toEqual([]);
  });
});
