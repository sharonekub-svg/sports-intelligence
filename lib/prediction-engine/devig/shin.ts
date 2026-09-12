/**
 * Shin-model de-vig — methodology.md §2.4.
 *
 * Shin (1991, 1993): a fraction z of bettors are "insiders" who bet only
 * on the true winner; the bookmaker prices against them, which is the
 * rational origin of the favorite-longshot bias (longshots get overpriced
 * relative to their true probability). Given the proportional shares
 * b_i = (1/odds_i) / Σ(1/odds_j), the model relates them to the fair
 * probability p_i through:
 *
 *   p_i = λ(1−z)b_i / (1 − zλb_i),   with λ solving Σ_i p_i = 1
 *
 * Sanity check baked into the implementation and covered by a test: at
 * z=0 this collapses exactly to λ=1, p_i=b_i — i.e. the proportional
 * method — which is the correct z→0 (no insiders) limit of the model.
 *
 * `z` here is a supplied parameter, not fit from data: methodology.md
 * calls for estimating z per league/market via MLE on settled historical
 * outcomes, which requires a results history this project doesn't have
 * yet. Until that calibration job exists, callers pass a literature-typical
 * default (see devig/index.ts) — this is a tracked simplification, not a
 * silently wrong number.
 */

export function shinDevig(prices: number[], z: number): number[] {
  if (prices.length === 0) throw new Error("prices must be non-empty");
  if (z < 0 || z >= 1) throw new Error("z must be in [0, 1)");

  const implied = prices.map((p) => 1 / p);
  const S = implied.reduce((a, b) => a + b, 0);
  const b = implied.map((pi) => pi / S);

  if (z === 0) return b;

  const maxB = Math.max(...b);
  const hi = (1 / (z * maxB)) * (1 - 1e-9);

  const g = (lambda: number) =>
    b.reduce(
      (sum, bi) => sum + (lambda * (1 - z) * bi) / (1 - z * lambda * bi),
      0
    ) - 1;

  let lo = 0;
  let upper = hi;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + upper) / 2;
    if (g(mid) < 0) {
      lo = mid;
    } else {
      upper = mid;
    }
  }

  const lambda = (lo + upper) / 2;
  return b.map((bi) => (lambda * (1 - z) * bi) / (1 - z * lambda * bi));
}
