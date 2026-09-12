/**
 * Benjamini-Hochberg FDR correction — methodology.md §7.3. Applied across
 * the whole batch of league×market combinations scanned together in one
 * backtest run, before any result is marked significant — otherwise
 * α=0.05 alone guarantees roughly 1-in-20 false "edges" per batch.
 *
 * Procedure: sort p-values ascending, find the largest i such that
 * p_(i) ≤ (i/m)·α, and reject (mark significant) every hypothesis at or
 * below that rank.
 */
export function benjaminiHochberg(pValues: number[], alpha = 0.05): boolean[] {
  const m = pValues.length;
  if (m === 0) return [];

  const indexed = pValues.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p - b.p);

  let largestSignificantRank = -1;
  for (let rank = 0; rank < m; rank++) {
    const threshold = ((rank + 1) / m) * alpha;
    if (indexed[rank].p <= threshold) {
      largestSignificantRank = rank;
    }
  }

  const significant = new Array<boolean>(m).fill(false);
  for (let rank = 0; rank <= largestSignificantRank; rank++) {
    significant[indexed[rank].i] = true;
  }
  return significant;
}
