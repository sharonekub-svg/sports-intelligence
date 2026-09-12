import { describe, it, expect } from "vitest";
import { fitTeamStrengths } from "@/lib/prediction-engine/football/poisson";
import { generateFootball1X2, generateBasketballMoneyline } from "@/lib/prediction-engine/index";

describe("generateFootball1X2 (end-to-end facade)", () => {
  const matches = [
    { homeTeamId: "Strong", awayTeamId: "Mid", homeGoals: 3, awayGoals: 1 },
    { homeTeamId: "Mid", awayTeamId: "Strong", homeGoals: 0, awayGoals: 2 },
    { homeTeamId: "Strong", awayTeamId: "Weak", homeGoals: 4, awayGoals: 0 },
    { homeTeamId: "Weak", awayTeamId: "Strong", homeGoals: 0, awayGoals: 3 },
    { homeTeamId: "Mid", awayTeamId: "Weak", homeGoals: 2, awayGoals: 1 },
    { homeTeamId: "Weak", awayTeamId: "Mid", homeGoals: 0, awayGoals: 2 },
  ];
  const teamStrengths = fitTeamStrengths(matches);

  it("produces a valid 3-way probability distribution that sums to 1", () => {
    const results = generateFootball1X2({
      homeTeamId: "Strong",
      awayTeamId: "Weak",
      teamStrengths,
      rho: -0.1,
      eloHome: 1650,
      eloAway: 1350,
      marketPrices1X2: [1.2, 6.0, 15.0],
      sampleSize: 6,
    });

    expect(results).toHaveLength(3);
    const total = results.reduce((s, r) => s + r.pModel, 0);
    expect(total).toBeCloseTo(1, 6);
    for (const r of results) {
      expect(r.pModel).toBeGreaterThanOrEqual(0);
      expect(r.pModel).toBeLessThanOrEqual(1);
    }
  });

  it("ranks the heavy favorite's home-win probability far above the away-win probability", () => {
    const results = generateFootball1X2({
      homeTeamId: "Strong",
      awayTeamId: "Weak",
      teamStrengths,
      rho: -0.1,
      eloHome: 1650,
      eloAway: 1350,
      marketPrices1X2: [1.2, 6.0, 15.0],
      sampleSize: 6,
    });
    const home = results.find((r) => r.outcome === "home")!;
    const away = results.find((r) => r.outcome === "away")!;
    expect(home.pModel).toBeGreaterThan(away.pModel);
    expect(home.pModel).toBeGreaterThan(0.6);
  });

  it("every outcome carries a self-consistent edge, CI, and score breakdown", () => {
    const results = generateFootball1X2({
      homeTeamId: "Strong",
      awayTeamId: "Mid",
      teamStrengths,
      rho: -0.1,
      eloHome: 1600,
      eloAway: 1500,
      marketPrices1X2: [1.6, 4.0, 5.5],
      sampleSize: 40,
      marketVolatility: 0.02,
      eceForBucket: 0.05,
    });

    for (const r of results) {
      expect(r.edge).toBeCloseTo(r.pModel - r.pMarketNoVig, 10);
      expect(r.wilsonCiLow).toBeLessThanOrEqual(r.wilsonCiHigh);
      expect(r.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(r.confidenceScore).toBeLessThanOrEqual(1);
      expect(r.isActionable).toBe(true); // no missingness context supplied
      expect(["shin", "power", "proportional"]).toContain(r.devigMethod);
    }
  });

  it("flags a match with a suspended market as not actionable", () => {
    const results = generateFootball1X2({
      homeTeamId: "Strong",
      awayTeamId: "Mid",
      teamStrengths,
      rho: -0.1,
      eloHome: 1600,
      eloAway: 1500,
      marketPrices1X2: [1.6, 4.0, 5.5],
      sampleSize: 40,
      missingness: { reason: "market_suspended" },
    });
    expect(results.every((r) => r.isActionable === false)).toBe(true);
    expect(results[0].missingness).toBe("MNAR");
  });
});

describe("generateBasketballMoneyline (end-to-end facade)", () => {
  it("produces a valid 2-way distribution and favors the projected-margin winner", () => {
    const results = generateBasketballMoneyline({
      margin: 8, // home favored by 8
      marginStdDev: 12,
      eloHome: 1600,
      eloAway: 1500,
      marketPricesMoneyline: [1.4, 3.0],
      sampleSize: 50,
    });

    expect(results).toHaveLength(2);
    const total = results.reduce((s, r) => s + r.pModel, 0);
    expect(total).toBeCloseTo(1, 8);

    const home = results.find((r) => r.outcome === "home")!;
    const away = results.find((r) => r.outcome === "away")!;
    expect(home.pModel).toBeGreaterThan(away.pModel);
    expect(home.pModel).toBeGreaterThan(0.5);
  });
});
