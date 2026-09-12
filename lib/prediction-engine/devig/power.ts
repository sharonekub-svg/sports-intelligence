/**
 * Power-method de-vig — methodology.md §2.3.
 *
 *   p_i = π_i^k / Σ π_j^k ,  solved for k such that Σ π_j^k = 1
 *
 * π_j = 1/odds_j ∈ (0,1), so π^k is strictly decreasing in k. At k=1 the
 * sum equals the raw overround total B (>1 for any real book), and as
 * k→∞ every term →0, so f(k) = Σπ_j^k − 1 is a continuous, strictly
 * decreasing function crossing zero exactly once for k>1 — a clean
 * bisection target. A flatter compromise between proportional (k≈1) and
 * Shin: shrinks longshots more than favorites without Shin's explicit
 * insider-trading parameter.
 */

export interface PowerDevigResult {
  probs: number[];
  k: number;
}

export function powerDevig(
  prices: number[],
  options: { tolerance?: number; maxIterations?: number } = {}
): PowerDevigResult {
  if (prices.length === 0) throw new Error("prices must be non-empty");
  const { tolerance = 1e-12, maxIterations = 200 } = options;

  const implied = prices.map((p) => 1 / p);
  const sumAtK = (k: number) => implied.reduce((sum, pi) => sum + pi ** k, 0);

  let lo = 0;
  let hi = 25; // generous upper bound; sumAtK(25) is ~0 for any realistic odds
  if (sumAtK(hi) > 1) {
    throw new Error("power de-vig failed to bracket a root — check input prices");
  }

  for (let i = 0; i < maxIterations && hi - lo > tolerance; i++) {
    const mid = (lo + hi) / 2;
    if (sumAtK(mid) > 1) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const k = (lo + hi) / 2;
  const probs = implied.map((pi) => pi ** k);
  return { probs, k };
}
