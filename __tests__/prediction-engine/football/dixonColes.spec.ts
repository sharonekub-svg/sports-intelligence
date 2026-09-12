import { describe, it, expect } from "vitest";
import { tau, fitRho } from "@/lib/prediction-engine/football/dixonColes";

describe("Dixon-Coles tau correction", () => {
  it("equals 1 outside the four adjusted low-score cells", () => {
    expect(tau(2, 1, 1.4, 1.1, -0.1)).toBe(1);
    expect(tau(0, 2, 1.4, 1.1, -0.1)).toBe(1);
  });

  it("matches the published formula on the four adjusted cells", () => {
    const lambda = 1.4;
    const mu = 1.1;
    const rho = -0.1;
    expect(tau(0, 0, lambda, mu, rho)).toBeCloseTo(1 - lambda * mu * rho, 10);
    expect(tau(0, 1, lambda, mu, rho)).toBeCloseTo(1 + lambda * rho, 10);
    expect(tau(1, 0, lambda, mu, rho)).toBeCloseTo(1 + mu * rho, 10);
    expect(tau(1, 1, lambda, mu, rho)).toBeCloseTo(1 - rho, 10);
  });

  it("rho=0 leaves every cell at 1 (reduces to independent Poisson)", () => {
    expect(tau(0, 0, 1.4, 1.1, 0)).toBe(1);
    expect(tau(0, 1, 1.4, 1.1, 0)).toBe(1);
    expect(tau(1, 0, 1.4, 1.1, 0)).toBe(1);
    expect(tau(1, 1, 1.4, 1.1, 0)).toBe(1);
  });
});

describe("fitRho", () => {
  it("finds a negative rho when 0-0 and 1-1 draws are over-represented (the documented empirical pattern)", () => {
    const lambda = 1.4;
    const mu = 1.1;
    // Build a match set with an excess of exact 0-0/1-1 draws beyond what
    // independent Poisson would predict — the documented real-world
    // pattern motivating Dixon-Coles (methodology.md: ρ typically ≈ -0.1).
    const matches = [
      ...Array(30).fill({ lambdaHome: lambda, lambdaAway: mu, homeGoals: 0, awayGoals: 0 }),
      ...Array(20).fill({ lambdaHome: lambda, lambdaAway: mu, homeGoals: 1, awayGoals: 1 }),
      ...Array(10).fill({ lambdaHome: lambda, lambdaAway: mu, homeGoals: 2, awayGoals: 1 }),
      ...Array(10).fill({ lambdaHome: lambda, lambdaAway: mu, homeGoals: 1, awayGoals: 2 }),
      ...Array(10).fill({ lambdaHome: lambda, lambdaAway: mu, homeGoals: 3, awayGoals: 0 }),
    ];
    const rho = fitRho(matches);
    expect(rho).toBeLessThan(0);
  });
});
