/**
 * Purge/embargo utilities — methodology.md §7.1. The core anti-leakage
 * mechanism for walkForward.ts: every feature used to predict a match must
 * be computed from data strictly before that match's date, minus an
 * embargo buffer.
 */

export function applyEmbargo(cutoffDate: Date, embargoDays: number): Date {
  if (embargoDays < 0) throw new Error("embargoDays must be non-negative");
  const embargoed = new Date(cutoffDate);
  embargoed.setDate(embargoed.getDate() - embargoDays);
  return embargoed;
}

/**
 * Throws if a feature computed at `featureComputedAt` would leak
 * information into a prediction for a match at `matchDate` — i.e. if the
 * feature's data reaches into the embargo window before the match.
 */
export function assertPointInTime(
  featureComputedAt: Date,
  matchDate: Date,
  embargoDays: number
): void {
  const cutoff = applyEmbargo(matchDate, embargoDays);
  if (featureComputedAt.getTime() >= cutoff.getTime()) {
    throw new Error(
      `look-ahead leakage: feature computed at ${featureComputedAt.toISOString()} ` +
        `is not before the embargoed cutoff ${cutoff.toISOString()} for a match on ${matchDate.toISOString()}`
    );
  }
}
