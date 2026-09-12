/**
 * Margin-based win-probability model — methodology.md §3.2. The primary
 * basketball model: no draw, so project an expected scoring margin and
 * convert to a win probability via the normal CDF, rather than reusing
 * football's Poisson machinery.
 *
 *   Δ = (netEfficiencyDiff / 100) · pace + homeEdge
 *   P(win) = Φ(Δ / σ)
 */

// Abramowitz & Stegun 7.1.26 rational approximation of erf; max absolute
// error ≈ 1.5e-7 — no dependency needed for a normal CDF at this precision.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * ax);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1 - poly * Math.exp(-ax * ax);

  return sign * y;
}

export function normalCdf(x: number, mean = 0, sigma = 1): number {
  if (sigma <= 0) throw new Error("sigma must be positive");
  return 0.5 * (1 + erf((x - mean) / (sigma * Math.SQRT2)));
}

/**
 * `netEfficiencyDiff`: home net rating minus away net rating, points per
 * 100 possessions. `pace`: projected possessions for the game.
 * `homeEdge`: additive home-court points (NBA-typical ≈ +3).
 */
export function projectedMargin(
  netEfficiencyDiff: number,
  pace: number,
  homeEdge: number
): number {
  return (netEfficiencyDiff / 100) * pace + homeEdge;
}

/**
 * `marginStdDev`: empirical standard deviation of game margins for the
 * league (NBA-typical ≈ 11–13 points).
 */
export function winProbability(margin: number, marginStdDev: number): number {
  return normalCdf(margin, 0, marginStdDev);
}
