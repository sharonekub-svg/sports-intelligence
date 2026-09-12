import { poissonPmf } from "./poissonMath";

/**
 * Dixon-Coles low-score correlation correction (Dixon & Coles, 1997) —
 * methodology.md §3.1. Independent Poisson under-fits the low-scoring
 * cells (0-0, 1-0, 0-1, 1-1); τ adjusts their joint probability.
 *
 *   τ(0,0) = 1 − λμρ
 *   τ(0,1) = 1 + λρ
 *   τ(1,0) = 1 + μρ
 *   τ(1,1) = 1 − ρ
 *   τ(x,y) = 1  otherwise
 */
export function tau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

export interface MatchExpectation {
  lambdaHome: number;
  lambdaAway: number;
  homeGoals: number;
  awayGoals: number;
}

/**
 * Fits ρ by maximizing the Dixon-Coles-adjusted Poisson log-likelihood
 * over historical matches (with λ/μ already computed from the team
 * strengths, e.g. via poisson.ts's fitTeamStrengths + expectedGoals).
 * A grid search over the realistic range is sufficient — ρ is a single
 * bounded parameter (methodology.md: "ρ טיפוסי ≈ −0.1") and the
 * log-likelihood is smooth and well-behaved there.
 */
export function fitRho(
  matches: MatchExpectation[],
  options: { range?: [number, number]; step?: number } = {}
): number {
  if (matches.length === 0) throw new Error("matches must be non-empty");
  const { range = [-0.3, 0.3], step = 0.001 } = options;

  const logLikelihood = (rho: number) =>
    matches.reduce((sum, m) => {
      const base = poissonPmf(m.homeGoals, m.lambdaHome) * poissonPmf(m.awayGoals, m.lambdaAway);
      const adjusted = base * tau(m.homeGoals, m.awayGoals, m.lambdaHome, m.lambdaAway, rho);
      return sum + Math.log(Math.max(adjusted, 1e-12));
    }, 0);

  let best = { rho: 0, ll: -Infinity };
  for (let rho = range[0]; rho <= range[1] + 1e-12; rho += step) {
    const ll = logLikelihood(rho);
    if (ll > best.ll) best = { rho, ll };
  }
  return best.rho;
}
