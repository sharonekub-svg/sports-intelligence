import { describe, it, expect } from "vitest";
import { applyEmbargo, assertPointInTime } from "@/lib/prediction-engine/backtest/purgeEmbargo";

describe("applyEmbargo", () => {
  it("shifts the cutoff back by the embargo window", () => {
    const cutoff = applyEmbargo(new Date("2026-01-10T00:00:00Z"), 3);
    expect(cutoff.toISOString()).toBe("2026-01-07T00:00:00.000Z");
  });

  it("rejects a negative embargo", () => {
    expect(() => applyEmbargo(new Date(), -1)).toThrow();
  });
});

describe("assertPointInTime — the anti-leakage guard", () => {
  it("throws on a deliberately leaky fixture (feature computed after the embargoed cutoff)", () => {
    const matchDate = new Date("2026-01-10T00:00:00Z");
    const featureComputedAt = new Date("2026-01-09T00:00:00Z"); // 1 day before match
    // With a 3-day embargo, anything after 2026-01-07 leaks.
    expect(() => assertPointInTime(featureComputedAt, matchDate, 3)).toThrow(/leakage/);
  });

  it("does not throw for a genuinely point-in-time feature", () => {
    const matchDate = new Date("2026-01-10T00:00:00Z");
    const featureComputedAt = new Date("2026-01-01T00:00:00Z");
    expect(() => assertPointInTime(featureComputedAt, matchDate, 3)).not.toThrow();
  });
});
