import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { brierScore } from "@/lib/prediction-engine/calibration/brier";
import { logLoss } from "@/lib/prediction-engine/calibration/logLoss";
import { expectedCalibrationError } from "@/lib/prediction-engine/calibration/ece";
import type { JobResult } from "./jobRunner";

/**
 * Recomputes LIVE performance metrics (Brier/LogLoss/ECE) for every model
 * version from its settled predictions — methodology.md §6. This is the
 * "how has the model actually done" number; `backtests` (a separate table,
 * populated only by an explicit admin-triggered walk-forward run) is the
 * structurally distinct "how would it have done historically" number.
 * `/model-performance` must never merge the two into one figure.
 */
export async function recomputeModelPerformance(): Promise<JobResult> {
  const admin = getAdminClient();

  const { data: modelVersions } = await admin.from("model_versions").select("id");
  let processed = 0;
  let updated = 0;

  for (const mv of (modelVersions ?? []) as { id: string }[]) {
    processed++;

    const { data: predictions } = await admin
      .from("predictions")
      .select("id, p_model")
      .eq("model_version_id", mv.id);
    if (!predictions || predictions.length === 0) continue;

    const predictionIds = predictions.map((p: { id: string }) => p.id);
    const { data: results } = await admin
      .from("prediction_results")
      .select("prediction_id, status")
      .in("prediction_id", predictionIds)
      .in("status", ["correct", "incorrect"]);
    if (!results || results.length === 0) continue;

    const pByPredictionId = new Map(
      (predictions as { id: string; p_model: number }[]).map((p) => [p.id, p.p_model])
    );
    const outcomes = (results as { prediction_id: string; status: string }[])
      .map((r) => ({ p: pByPredictionId.get(r.prediction_id), outcome: (r.status === "correct" ? 1 : 0) as 0 | 1 }))
      .filter((o): o is { p: number; outcome: 0 | 1 } => o.p !== undefined);

    if (outcomes.length === 0) continue;

    const brier = brierScore(outcomes);
    const ll = logLoss(outcomes);
    const { ece } = expectedCalibrationError(outcomes);

    const { error } = await admin
      .from("model_versions")
      .update({ brier_score: brier, log_loss: ll, ece, sample_size: outcomes.length, trained_at: new Date().toISOString() })
      .eq("id", mv.id);
    if (!error) updated++;
  }

  return { rowsProcessed: processed, rowsUpdated: updated };
}
