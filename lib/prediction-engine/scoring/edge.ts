/**
 * Edge helpers — methodology.md §4, §12.1.
 * Both inputs must already be no-vig probabilities (see devig/).
 */

export function computeEdge(pModel: number, pMarketNoVig: number): number {
  return pModel - pMarketNoVig;
}

/** EV per unit staked at decimal odds `d`: EV = p·d − 1. */
export function expectedValue(pModel: number, decimalOdds: number): number {
  return pModel * decimalOdds - 1;
}
