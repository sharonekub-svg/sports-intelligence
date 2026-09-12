import { describe, it, expect } from "vitest";
import { fitShrunkTeamStrengths } from "@/lib/prediction-engine/football/teamStrength";
import type { HistoricalMatch } from "@/lib/prediction-engine/football/poisson";

describe("fitShrunkTeamStrengths", () => {
  it("pulls a team with very few matches closer to the league mean than a well-sampled team", () => {
    const matches: HistoricalMatch[] = [];
    // "Established" plays a lot, with a consistently strong record.
    for (let i = 0; i < 30; i++) {
      matches.push({ homeTeamId: "Established", awayTeamId: `Opp${i}`, homeGoals: 3, awayGoals: 0 });
      matches.push({ homeTeamId: `Opp${i}`, awayTeamId: "Established", homeGoals: 0, awayGoals: 3 });
    }
    // "Newcomer" has the exact same per-match record, but only 2 matches.
    matches.push({ homeTeamId: "Newcomer", awayTeamId: "OppA", homeGoals: 3, awayGoals: 0 });
    matches.push({ homeTeamId: "OppA", awayTeamId: "Newcomer", homeGoals: 0, awayGoals: 3 });

    const fitted = fitShrunkTeamStrengths(matches, { kappa: 8 });

    expect(fitted.shrinkageWeight.Newcomer).toBeLessThan(fitted.shrinkageWeight.Established);
    expect(fitted.sampleSize.Newcomer).toBeLessThan(fitted.sampleSize.Established);
  });

  it("exposes sample size and shrinkage weight for every team", () => {
    const matches: HistoricalMatch[] = [
      { homeTeamId: "A", awayTeamId: "B", homeGoals: 2, awayGoals: 1 },
    ];
    const fitted = fitShrunkTeamStrengths(matches);
    expect(fitted.sampleSize.A).toBe(1);
    expect(fitted.sampleSize.B).toBe(1);
    expect(fitted.shrinkageWeight.A).toBeGreaterThan(0);
    expect(fitted.shrinkageWeight.A).toBeLessThan(1);
  });
});
