/**
 * Brier score — methodology.md §6.1 (Brier, 1950). Strictly proper scoring
 * rule: minimized in expectation by reporting the true probability.
 *
 * Binary form: BS = (1/N) Σ (f_t − o_t)²
 *
 * For an R-way outcome (e.g. 1X2), pass one PredictionOutcome per class per
 * match and this averages over all of them — equivalent to the R=3 "vector"
 * formulation in Brier's original 1950 paper. Do not mix binary-only and
 * multi-class results in the same average (see methodology.md §6.1's
 * factor-of-2 warning).
 */

export interface PredictionOutcome {
  /** Forecast probability assigned to the class. */
  p: number;
  /** 1 if this class occurred, 0 otherwise. */
  outcome: 0 | 1;
}

export function brierScore(predictions: PredictionOutcome[]): number {
  if (predictions.length === 0) throw new Error("predictions must be non-empty");
  const sumSquaredError = predictions.reduce(
    (sum, { p, outcome }) => sum + (p - outcome) ** 2,
    0
  );
  return sumSquaredError / predictions.length;
}

/**
 * Brier Skill Score against a climatology (base-rate) baseline:
 * BSS = 1 − BS_model / BS_climatology. Positive means the model beats
 * always-predicting-the-base-rate; 0 means no better than climatology.
 */
export function brierSkillScore(
  predictions: PredictionOutcome[],
  baseRate: number
): number {
  const modelScore = brierScore(predictions);
  const climatologyScore = baseRate * (1 - baseRate);
  if (climatologyScore === 0) return modelScore === 0 ? 1 : -Infinity;
  return 1 - modelScore / climatologyScore;
}
