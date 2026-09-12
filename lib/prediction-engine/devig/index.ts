import { noVigProbability, overround } from "./proportional";
import { powerDevig } from "./power";
import { shinDevig } from "./shin";

export type DevigMethod = "proportional" | "power" | "shin";

export interface DevigResult {
  probs: number[];
  method: DevigMethod;
  overround: number;
}

/**
 * Literature-typical insider-fraction default for the Shin model (see
 * shin.ts doc comment). Replace with a per-league MLE-fitted value once
 * `backtest`/settlement history exists — tracked in docs/methodology.md §2.4.
 */
export const DEFAULT_SHIN_Z = 0.02;

/**
 * Selects a de-vig method per methodology.md §2:
 * - Near-even two-way markets → proportional (favorite-longshot bias has
 *   little room to operate; the simple method is adequate).
 * - Everything else → Shin (corrects the favorite-longshot bias), falling
 *   back to the power method if Shin's root-finding fails (e.g. a
 *   pathological/near-zero price).
 * - Additive de-vig is never offered here — methodology.md explicitly
 *   rules it out (can produce negative probabilities on longshots).
 */
export function deVig(
  prices: number[],
  options: {
    marketShape?: "two-way" | "multi-way";
    shinZ?: number;
  } = {}
): DevigResult {
  if (prices.length < 2) {
    throw new Error("de-vig requires at least two outcomes");
  }

  const shape = options.marketShape ?? (prices.length === 2 ? "two-way" : "multi-way");
  const round = overround(prices);

  if (shape === "two-way") {
    const implied = prices.map((p) => 1 / p);
    const skew = Math.max(...implied) / Math.min(...implied);
    if (skew < 2) {
      return { probs: noVigProbability(prices), method: "proportional", overround: round };
    }
  }

  try {
    const z = options.shinZ ?? DEFAULT_SHIN_Z;
    const probs = shinDevig(prices, z);
    if (probs.some((p) => !Number.isFinite(p) || p < 0)) {
      throw new Error("shin de-vig produced an invalid probability");
    }
    return { probs, method: "shin", overround: round };
  } catch {
    const { probs } = powerDevig(prices);
    return { probs, method: "power", overround: round };
  }
}

export { noVigProbability, overround } from "./proportional";
export { powerDevig } from "./power";
export { shinDevig } from "./shin";
