/**
 * Ensemble combiner — methodology.md §9 (calibration section) /
 * cross-cutting recommendation: average CALIBRATED probabilities, not raw
 * logits, and weight members by their own historical calibration quality
 * (Brier/ECE) rather than a hand-picked constant.
 */

export interface ModelOutput {
  source: string;
  prob: number;
  /**
   * Ensemble weight for this member. If omitted, all members are weighted
   * equally. Callers should derive this from the member's historical
   * Brier/ECE (e.g. `weight = 1 / brierScore`) rather than hardcoding it —
   * this function itself stays agnostic to where the weight came from.
   */
  weight?: number;
}

export function combineModels(models: ModelOutput[]): number {
  if (models.length === 0) throw new Error("models must be non-empty");

  const totalWeight = models.reduce((sum, m) => sum + (m.weight ?? 1), 0);
  if (totalWeight <= 0) throw new Error("total ensemble weight must be positive");

  const weightedSum = models.reduce(
    (sum, m) => sum + (m.weight ?? 1) * m.prob,
    0
  );

  return weightedSum / totalWeight;
}
