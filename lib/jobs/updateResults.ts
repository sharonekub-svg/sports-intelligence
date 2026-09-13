import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { deterministicRowId } from "@/lib/idempotency/rowId";
import type { JobResult } from "./jobRunner";

interface FinishedMatch {
  id: string;
  home_score: number;
  away_score: number;
}

interface PredictionRow {
  id: string;
  match_id: string;
  market: string;
  outcome: string;
}

/**
 * Settles every prediction on a finished match into prediction_results.
 * Runs only against status='final' matches — a match without a
 * prediction_results row yet simply hasn't finished (this job never
 * creates a "pending" placeholder), so there's no downgrade risk to guard
 * against: correctness of a genuinely final match's outcome is stable
 * once computed.
 */
export async function updateResults(): Promise<JobResult> {
  const admin = getAdminClient();

  const { data: finishedMatches } = await admin
    .from("matches")
    .select("id, home_score, away_score")
    .eq("status", "final")
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  let processed = 0;
  let written = 0;

  for (const match of (finishedMatches ?? []) as FinishedMatch[]) {
    const { data: predictions } = await admin
      .from("predictions")
      .select("id, match_id, market, outcome")
      .eq("match_id", match.id);
    if (!predictions || predictions.length === 0) continue;

    const actualOutcome =
      match.home_score === match.away_score ? "draw" : match.home_score > match.away_score ? "home" : "away";

    for (const pred of predictions as PredictionRow[]) {
      processed++;
      const rowHash = deterministicRowId([match.id, pred.market, pred.outcome, "settlement"]);
      const status = pred.outcome === actualOutcome ? "correct" : "incorrect";

      const { error } = await admin.from("prediction_results").upsert(
        {
          prediction_id: pred.id,
          match_id: match.id,
          status,
          result_status: "final",
          settled_at: new Date().toISOString(),
          row_hash: rowHash,
        },
        { onConflict: "row_hash" }
      );
      if (!error) written++;
    }
  }

  return { rowsProcessed: processed, rowsInserted: written };
}
