/**
 * Elo rating — methodology.md §3.4. Generic, sport-agnostic baseline used
 * as one ensemble member across football and basketball.
 *
 *   E_A = 1 / (1 + 10^((R_B - R_A)/400))
 *   R_A' = R_A + K·(S_A - E_A)
 */

export function expectedScore(
  ratingA: number,
  ratingB: number,
  homeAdvantage = 0
): number {
  return 1 / (1 + 10 ** ((ratingB - (ratingA + homeAdvantage)) / 400));
}

export interface EloUpdateResult {
  newRatingA: number;
  newRatingB: number;
}

/**
 * `actualScoreA`: 1 = A won, 0.5 = draw, 0 = A lost.
 */
export function updateRatings(
  ratingA: number,
  ratingB: number,
  actualScoreA: number,
  k: number,
  homeAdvantage = 0
): EloUpdateResult {
  if (actualScoreA < 0 || actualScoreA > 1) {
    throw new Error("actualScoreA must be in [0, 1]");
  }
  const expectedA = expectedScore(ratingA, ratingB, homeAdvantage);
  const delta = k * (actualScoreA - expectedA);
  return {
    newRatingA: ratingA + delta,
    newRatingB: ratingB - delta,
  };
}
