import { describe, it, expect } from "vitest";
import { fitTeamStrengths, expectedGoals, type HistoricalMatch } from "@/lib/prediction-engine/football/poisson";

describe("fitTeamStrengths (Maher/IPF)", () => {
  it("recovers the exact expected-goals product from noiseless synthetic data", () => {
    // Ground truth: attack/defence/homeAdvantage the IPF fit should
    // reconstruct. Since attack_i·defence_j has an inherent scale
    // ambiguity (attack can be scaled up while defence scales down with
    // no change to any prediction), we don't assert on the individual
    // parameters — we assert the recomposed λ (what actually matters for
    // every downstream use) matches the generating values.
    const trueAttack: Record<string, number> = { A: 1.5, B: 1.0, C: 0.7 };
    const trueDefence: Record<string, number> = { A: 0.9, B: 1.0, C: 1.3 };
    const trueHomeAdvantage = 1.2;
    const teams = Object.keys(trueAttack);

    const matches: HistoricalMatch[] = [];
    for (const home of teams) {
      for (const away of teams) {
        if (home === away) continue;
        // Noiseless "matches": goals set exactly to the true λ (not an
        // integer sample) purely to validate the fitting math converges
        // to the generating parameters — not representative of real
        // input, which is always integer goal counts.
        matches.push({
          homeTeamId: home,
          awayTeamId: away,
          homeGoals: trueAttack[home] * trueDefence[away] * trueHomeAdvantage,
          awayGoals: trueAttack[away] * trueDefence[home],
        });
      }
    }

    const fitted = fitTeamStrengths(matches, { iterations: 300 });

    for (const home of teams) {
      for (const away of teams) {
        if (home === away) continue;
        const { lambdaHome, lambdaAway } = expectedGoals(fitted, home, away);
        const trueLambdaHome = trueAttack[home] * trueDefence[away] * trueHomeAdvantage;
        const trueLambdaAway = trueAttack[away] * trueDefence[home];
        expect(lambdaHome).toBeCloseTo(trueLambdaHome, 3);
        expect(lambdaAway).toBeCloseTo(trueLambdaAway, 3);
      }
    }
  });

  it("ranks teams sensibly on realistic integer-goal data", () => {
    // Team "Strong" beats everyone comfortably; "Weak" loses everyone.
    const matches: HistoricalMatch[] = [
      { homeTeamId: "Strong", awayTeamId: "Mid", homeGoals: 3, awayGoals: 1 },
      { homeTeamId: "Mid", awayTeamId: "Strong", homeGoals: 0, awayGoals: 2 },
      { homeTeamId: "Strong", awayTeamId: "Weak", homeGoals: 4, awayGoals: 0 },
      { homeTeamId: "Weak", awayTeamId: "Strong", homeGoals: 0, awayGoals: 3 },
      { homeTeamId: "Mid", awayTeamId: "Weak", homeGoals: 2, awayGoals: 1 },
      { homeTeamId: "Weak", awayTeamId: "Mid", homeGoals: 0, awayGoals: 2 },
    ];
    const fitted = fitTeamStrengths(matches);
    expect(fitted.attack.Strong).toBeGreaterThan(fitted.attack.Mid);
    expect(fitted.attack.Mid).toBeGreaterThan(fitted.attack.Weak);

    // Strong at home vs. Weak: Strong should be a heavy expected scorer.
    const { lambdaHome: strongAtHomeVsWeak } = expectedGoals(fitted, "Strong", "Weak");
    expect(strongAtHomeVsWeak).toBeGreaterThan(2);

    // Weak away at Strong: Weak should be expected to score very little.
    const { lambdaAway: weakAwayAtStrong } = expectedGoals(fitted, "Strong", "Weak");
    expect(weakAwayAtStrong).toBeLessThan(1);
  });

  it("throws when a team is missing from the fitted strengths", () => {
    const matches: HistoricalMatch[] = [
      { homeTeamId: "A", awayTeamId: "B", homeGoals: 1, awayGoals: 1 },
    ];
    const fitted = fitTeamStrengths(matches);
    expect(() => expectedGoals(fitted, "A", "Z")).toThrow();
  });
});
