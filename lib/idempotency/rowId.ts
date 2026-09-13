import { createHash } from "node:crypto";

/**
 * Deterministic row id — hapogea's proven pattern (hash of day+sport+
 * event+market+outcome+pick) so re-running a job against the same day's
 * feed twice never creates duplicate rows. Used as `prediction_results.row_hash`.
 */
export function deterministicRowId(parts: (string | number)[]): string {
  const input = parts.map(String).join("|");
  return createHash("sha1").update(input).digest("hex").slice(0, 32);
}
