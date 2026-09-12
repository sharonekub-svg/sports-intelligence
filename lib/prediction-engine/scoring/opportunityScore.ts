/**
 * Opportunity Score — methodology.md §12. The principled composite:
 * risk-adjusted edge, NOT raw |model − market| gap.
 *
 *   Opportunity ∝ E[edge] / se(edge)
 *
 * This single ratio already suppresses small-sample and longshot noise
 * without any hand-tuned weight (methodology.md §12.4's central
 * anti-pattern to avoid): both shrink `se` upward automatically.
 */

/**
 * Combines sampling uncertainty (√(p(1−p)/n), methodology.md §10) with
 * market-price volatility (caller-supplied — e.g. the standard deviation
 * of the no-vig probability across recent odds_snapshots for this market)
 * as independent variance components.
 */
export function standardErrorOfEdge(
  pModel: number,
  sampleSize: number,
  marketVolatility = 0
): number {
  if (sampleSize <= 0) throw new Error("sampleSize must be positive");
  if (pModel < 0 || pModel > 1) throw new Error("pModel must be in [0, 1]");

  const samplingSe = Math.sqrt((pModel * (1 - pModel)) / sampleSize);
  return Math.sqrt(samplingSe ** 2 + marketVolatility ** 2);
}

export function opportunityScore(edge: number, se: number): number {
  if (se <= 0) throw new Error("se must be positive");
  return edge / se;
}
