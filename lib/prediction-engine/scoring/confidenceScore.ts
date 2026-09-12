/**
 * Confidence Score — methodology.md §11, §12.4. Answers a DIFFERENT
 * question than Opportunity Score: "how much should we trust p_model
 * itself?" — a function of the model's own historical calibration
 * quality in this league/bucket (ECE) and the epistemic uncertainty
 * (CI width) around the estimate, never the same number as Opportunity,
 * and always shown with its component breakdown (methodology.md's
 * anti-pattern: "a single opaque score with no visible breakdown").
 *
 * The 50/50 split between the two penalty terms below is a documented
 * starting default, exactly like the Shin-model z and the shrinkage κ
 * elsewhere in this engine — methodology.md §12.3 calls for fitting
 * component weights out-of-sample against realized accuracy, which
 * requires settlement history this project doesn't have yet. Tracked
 * here, not silently presented as already-calibrated.
 */

export interface ConfidenceComponents {
  calibrationPenalty: number;
  uncertaintyPenalty: number;
}

export function confidenceScore(
  eceForBucket: number,
  ciWidth: number
): { score: number; components: ConfidenceComponents } {
  const calibrationPenalty = Math.min(1, Math.max(0, eceForBucket));
  const uncertaintyPenalty = Math.min(1, Math.max(0, ciWidth));

  const score = Math.max(0, 1 - 0.5 * calibrationPenalty - 0.5 * uncertaintyPenalty);

  return { score, components: { calibrationPenalty, uncertaintyPenalty } };
}
