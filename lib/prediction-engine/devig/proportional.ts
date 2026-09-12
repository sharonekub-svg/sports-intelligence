/**
 * Proportional (multiplicative) de-vig — methodology.md §2.1.
 *
 *   p_i = (1/odds_i) / Σ(1/odds_j)
 *
 * Assumes the bookmaker's margin is spread proportionally to implied
 * probability. Appropriate for near-even two-way markets; inherits the
 * favorite-longshot bias on markets with skewed prices — see shin.ts.
 */

export function overround(prices: number[]): number {
  if (prices.length === 0) throw new Error("prices must be non-empty");
  return prices.reduce((sum, p) => sum + 1 / p, 0) - 1;
}

export function noVigProbability(prices: number[]): number[] {
  if (prices.length === 0) throw new Error("prices must be non-empty");
  const implied = prices.map((p) => 1 / p);
  const total = implied.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    throw new Error("invalid prices: implied total must be positive");
  }
  return implied.map((p) => p / total);
}
