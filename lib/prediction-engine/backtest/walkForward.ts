import { applyEmbargo } from "./purgeEmbargo";
import type { PredictionOutcome } from "../calibration/brier";

/**
 * Walk-forward / rolling-origin evaluation harness — methodology.md §7.1.
 * The ONLY backtest entry point in this engine: there is no k-fold/random
 * split code path anywhere in this module, by design (methodology.md's
 * hard rule against it).
 *
 * This function only owns the chronological windowing and the embargoed
 * training cutoff; the caller's `fitAndPredict` callback is responsible
 * for actually respecting point-in-time discipline when it fits a model
 * and generates predictions (e.g. by only reading `team_ratings` rows with
 * `as_of <= trainCutoff`, or by calling `assertPointInTime` itself).
 */

export interface WalkForwardOptions {
  windowStart: Date;
  windowEnd: Date;
  stepDays: number;
  embargoDays: number;
}

export interface WalkForwardResult {
  stepCount: number;
  predictions: PredictionOutcome[];
}

export function runWalkForward(
  options: WalkForwardOptions,
  fitAndPredict: (trainCutoff: Date, testStart: Date, testEnd: Date) => PredictionOutcome[]
): WalkForwardResult {
  if (options.stepDays <= 0) throw new Error("stepDays must be positive");
  if (options.windowEnd <= options.windowStart) {
    throw new Error("windowEnd must be after windowStart");
  }

  const predictions: PredictionOutcome[] = [];
  let stepCount = 0;
  let cursor = new Date(options.windowStart);

  while (cursor < options.windowEnd) {
    const testStart = new Date(cursor);
    const testEnd = new Date(
      Math.min(
        cursor.getTime() + options.stepDays * 24 * 60 * 60 * 1000,
        options.windowEnd.getTime()
      )
    );
    const trainCutoff = applyEmbargo(testStart, options.embargoDays);

    predictions.push(...fitAndPredict(trainCutoff, testStart, testEnd));
    stepCount++;
    cursor = testEnd;
  }

  return { stepCount, predictions };
}
