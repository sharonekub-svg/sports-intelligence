import { describe, it, expect } from "vitest";
import { runWalkForward } from "@/lib/prediction-engine/backtest/walkForward";

describe("runWalkForward", () => {
  it("generates the expected number of steps and always trains before the embargoed cutoff", () => {
    const calls: { trainCutoff: Date; testStart: Date; testEnd: Date }[] = [];

    const result = runWalkForward(
      {
        windowStart: new Date("2026-01-01T00:00:00Z"),
        windowEnd: new Date("2026-01-31T00:00:00Z"), // 30 days
        stepDays: 10,
        embargoDays: 3,
      },
      (trainCutoff, testStart, testEnd) => {
        calls.push({ trainCutoff, testStart, testEnd });
        return [{ p: 0.6, outcome: 1 }];
      }
    );

    expect(result.stepCount).toBe(3); // 30 days / 10-day steps
    expect(calls).toHaveLength(3);

    for (const call of calls) {
      const expectedCutoff = new Date(call.testStart);
      expectedCutoff.setDate(expectedCutoff.getDate() - 3);
      expect(call.trainCutoff.getTime()).toBe(expectedCutoff.getTime());
      expect(call.trainCutoff.getTime()).toBeLessThan(call.testStart.getTime());
    }

    // Steps should tile the window contiguously with no gaps/overlaps.
    expect(calls[0].testStart.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(calls[1].testStart.toISOString()).toBe(calls[0].testEnd.toISOString());
    expect(calls[2].testEnd.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("pools predictions from every step", () => {
    const result = runWalkForward(
      {
        windowStart: new Date("2026-01-01T00:00:00Z"),
        windowEnd: new Date("2026-01-21T00:00:00Z"),
        stepDays: 10,
        embargoDays: 1,
      },
      () => [{ p: 0.5, outcome: 1 }, { p: 0.5, outcome: 0 }]
    );
    expect(result.predictions).toHaveLength(4); // 2 steps × 2 predictions each
  });

  it("rejects a non-positive step size", () => {
    expect(() =>
      runWalkForward(
        { windowStart: new Date(), windowEnd: new Date(Date.now() + 1000), stepDays: 0, embargoDays: 1 },
        () => []
      )
    ).toThrow();
  });

  it("rejects a window end before window start", () => {
    expect(() =>
      runWalkForward(
        { windowStart: new Date(), windowEnd: new Date(Date.now() - 1000), stepDays: 1, embargoDays: 1 },
        () => []
      )
    ).toThrow();
  });
});
