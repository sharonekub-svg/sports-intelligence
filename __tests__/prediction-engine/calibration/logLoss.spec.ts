import { describe, it, expect } from "vitest";
import { logLoss } from "@/lib/prediction-engine/calibration/logLoss";

describe("logLoss", () => {
  it("matches a hand-computed example", () => {
    const predictions = [
      { p: 0.8, outcome: 1 as const },
      { p: 0.8, outcome: 0 as const },
    ];
    // -(ln(0.8) + ln(0.2)) / 2 ≈ 0.916291
    expect(logLoss(predictions)).toBeCloseTo(0.916291, 5);
  });

  it("is 0 for perfect, fully-confident predictions", () => {
    const predictions = [
      { p: 1, outcome: 1 as const },
      { p: 0, outcome: 0 as const },
    ];
    expect(logLoss(predictions)).toBeCloseTo(0, 5);
  });

  it("does not blow up to Infinity on a confident miss (floor clipping)", () => {
    const predictions = [{ p: 0, outcome: 1 as const }];
    expect(Number.isFinite(logLoss(predictions))).toBe(true);
  });

  it("grows without bound as the miss gets more confident (unlike Brier, which saturates at 1)", () => {
    const mild = logLoss([{ p: 0.6, outcome: 0 as const }]);
    const confident = logLoss([{ p: 0.999, outcome: 0 as const }]);
    const extreme = logLoss([{ p: 0.99999, outcome: 0 as const }]);
    expect(confident).toBeGreaterThan(mild * 5);
    expect(extreme).toBeGreaterThan(confident * 1.2);
  });
});
