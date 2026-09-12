import { describe, it, expect, vi, afterEach } from "vitest";
import { getProviders, withProviderFallback } from "@/lib/providers/providerRegistry";
import { oddsApiProvider } from "@/lib/providers/oddsApiProvider";
import { freeScoresProvider } from "@/lib/providers/freeScoresProvider";

describe("providerRegistry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes 'odds' to the odds-capable provider(s)", () => {
    const providers = getProviders("odds");
    expect(providers).toContain(oddsApiProvider);
    expect(providers.every((p) => p.kind === "odds" || p.kind === "both")).toBe(true);
  });

  it("routes 'scores' to the scores-capable provider(s)", () => {
    const providers = getProviders("scores");
    expect(providers).toContain(freeScoresProvider);
    expect(providers.every((p) => p.kind === "scores" || p.kind === "both")).toBe(true);
  });

  it("returns a successful provider's result", async () => {
    vi.spyOn(oddsApiProvider, "getUpcomingOdds").mockResolvedValue([]);
    const result = await withProviderFallback("odds", (p) =>
      p.getUpcomingOdds({ sportKey: "soccer_epl" })
    );
    expect(result).toEqual([]);
  });

  it("aggregates every provider's failure into one descriptive error when all fail", async () => {
    vi.spyOn(oddsApiProvider, "getUpcomingOdds").mockRejectedValue(new Error("quota exceeded"));
    await expect(
      withProviderFallback("odds", (p) => p.getUpcomingOdds({ sportKey: "soccer_epl" }))
    ).rejects.toThrow(/quota exceeded/);
  });

  // NOTE: only one concrete provider is registered per kind today (see
  // providerRegistry.ts's REGISTRY constant), so the "try provider 2 after
  // provider 1 fails" branch of withProviderFallback's loop has no live
  // second provider to exercise yet — this is a documented gap, not a
  // hidden one. Add a test here once a second same-kind provider exists.
});
