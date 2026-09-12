/**
 * Missing-data classification — methodology.md §8.2 (Rubin, 1976).
 * MNAR cases (market suspended, lineup unknown) must be flagged
 * "not actionable" rather than silently imputed — this maps directly to
 * `predictions.missingness` / `predictions.is_actionable` in the schema.
 */

export type MissingnessType = "MCAR" | "MAR" | "MNAR";

export interface MissingnessContext {
  reason?:
    | "market_suspended"
    | "unknown_lineup"
    | "match_status_unclear"
    | "provider_gap"
    | "data_entry_error"
    | string;
}

// The absence itself carries information about the outcome — MNAR.
const MNAR_REASONS = new Set(["market_suspended", "unknown_lineup", "match_status_unclear"]);
// Absence is unrelated to any value, observed or missing — safe to drop.
const MCAR_REASONS = new Set(["provider_gap", "data_entry_error"]);

/**
 * Conservative default: an unrecognized reason is classified MAR (depends
 * on observed data — requires proper imputation, not just dropping), never
 * silently treated as MCAR.
 */
export function classifyMissingness(context: MissingnessContext): MissingnessType {
  if (context.reason && MNAR_REASONS.has(context.reason)) return "MNAR";
  if (context.reason && MCAR_REASONS.has(context.reason)) return "MCAR";
  return "MAR";
}

export function isActionable(missingness: MissingnessType): boolean {
  return missingness !== "MNAR";
}
