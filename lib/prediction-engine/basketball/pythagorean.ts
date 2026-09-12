/**
 * Pythagorean win expectation — methodology.md §3.2. Secondary/sanity-check
 * input into the ensemble; `marginModel.ts` is the primary basketball
 * model (no draw exists in basketball, so a margin-based normal model is
 * the more natural fit than Poisson).
 *
 *   W% = E^c / (E^c + D^c)
 *
 * Default exponent 13.91 is the NBA-calibrated value (Morey/Oliver).
 */
export function pythagoreanWinExpectation(
  pointsFor: number,
  pointsAgainst: number,
  exponent = 13.91
): number {
  if (pointsFor <= 0 || pointsAgainst <= 0) {
    throw new Error("pointsFor and pointsAgainst must be positive");
  }
  const forExp = pointsFor ** exponent;
  const againstExp = pointsAgainst ** exponent;
  return forExp / (forExp + againstExp);
}
