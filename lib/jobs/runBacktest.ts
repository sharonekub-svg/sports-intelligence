import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { runWalkForward } from "@/lib/prediction-engine/backtest/walkForward";
import { fitTeamStrengths, expectedGoals, type HistoricalMatch } from "@/lib/prediction-engine/football/poisson";
import { fitRho } from "@/lib/prediction-engine/football/dixonColes";
import { buildScoreGrid, toMarketProbabilities } from "@/lib/prediction-engine/football/scoreGrid";
import { brierScore, type PredictionOutcome } from "@/lib/prediction-engine/calibration/brier";
import { getOrCreateActiveModelVersion } from "./modelVersions";

interface FinishedMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  scheduled_at: string;
}

const MIN_HISTORY_FOR_BACKTEST = 30;
const MIN_TRAIN_SET_PER_STEP = 10;
const STEP_DAYS = 30;
const EMBARGO_DAYS = 3;

/**
 * A genuine walk-forward backtest (methodology.md §7.1) for one league —
 * triggered manually from /admin/backtests, not run on a schedule.
 *
 * Honest scope note: this evaluates ONE league in isolation, so there is
 * no multi-hypothesis batch to apply Benjamini-Hochberg FDR correction
 * over (methodology.md §7.3 requires a batch of simultaneously-scanned
 * league×market combinations for that to mean anything) — is_significant
 * is left false and fdr_adjusted_p_value null here, documented rather
 * than faked. A true FDR-corrected significance test needs a batch
 * runner triggering many leagues at once, which is a natural next step,
 * not implemented in this version.
 */
export async function runBacktestForLeague(
  leagueId: string
): Promise<{ backtestId: string } | { error: string }> {
  const admin = getAdminClient();

  const { data: league } = await admin
    .from("leagues")
    .select("id, sport_id")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) return { error: "ליגה לא נמצאה" };

  const { data: sport } = await admin.from("sports").select("key").eq("id", league.sport_id).maybeSingle();
  const sportKey = (sport as { key: string } | null)?.key;
  if (sportKey !== "football") {
    return { error: "Backtest זמין כרגע רק לכדורגל (Poisson/Dixon-Coles)" };
  }

  const { data: matches } = await admin
    .from("matches")
    .select("id, home_team_id, away_team_id, home_score, away_score, scheduled_at")
    .eq("league_id", leagueId)
    .eq("status", "final")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("scheduled_at", { ascending: true });

  const finished = (matches ?? []) as FinishedMatch[];
  if (finished.length < MIN_HISTORY_FOR_BACKTEST) {
    return {
      error: `נדרשים לפחות ${MIN_HISTORY_FOR_BACKTEST} משחקים היסטוריים בליגה זו, יש ${finished.length}`,
    };
  }

  const windowStart = new Date(finished[0].scheduled_at);
  const windowEnd = new Date(finished[finished.length - 1].scheduled_at);

  const result = runWalkForward(
    { windowStart, windowEnd, stepDays: STEP_DAYS, embargoDays: EMBARGO_DAYS },
    (trainCutoff, testStart, testEnd) => {
      const trainSet = finished.filter((m) => new Date(m.scheduled_at).getTime() < trainCutoff.getTime());
      const testSet = finished.filter((m) => {
        const t = new Date(m.scheduled_at).getTime();
        return t >= testStart.getTime() && t < testEnd.getTime();
      });
      if (trainSet.length < MIN_TRAIN_SET_PER_STEP || testSet.length === 0) return [];

      const historicalMatches: HistoricalMatch[] = trainSet.map((m) => ({
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        homeGoals: m.home_score,
        awayGoals: m.away_score,
      }));
      const strengths = fitTeamStrengths(historicalMatches);
      const rho = fitRho(
        historicalMatches.map((m) => {
          const { lambdaHome, lambdaAway } = expectedGoals(strengths, m.homeTeamId, m.awayTeamId);
          return { lambdaHome, lambdaAway, homeGoals: m.homeGoals, awayGoals: m.awayGoals };
        })
      );

      const stepOutcomes: PredictionOutcome[] = [];
      for (const m of testSet) {
        if (!(m.home_team_id in strengths.attack) || !(m.away_team_id in strengths.attack)) continue;
        const { lambdaHome, lambdaAway } = expectedGoals(strengths, m.home_team_id, m.away_team_id);
        const grid = buildScoreGrid(lambdaHome, lambdaAway, rho);
        const { oneXTwo } = toMarketProbabilities(grid);
        const actual = m.home_score > m.away_score ? "home" : m.home_score === m.away_score ? "draw" : "away";
        stepOutcomes.push({ p: oneXTwo.home, outcome: actual === "home" ? 1 : 0 });
        stepOutcomes.push({ p: oneXTwo.draw, outcome: actual === "draw" ? 1 : 0 });
        stepOutcomes.push({ p: oneXTwo.away, outcome: actual === "away" ? 1 : 0 });
      }
      return stepOutcomes;
    }
  );

  if (result.predictions.length === 0) {
    return { error: "אין מספיק נתונים רציפים לאורך הזמן להערכת walk-forward" };
  }

  const brier = brierScore(result.predictions);
  const modelVersionId = await getOrCreateActiveModelVersion(league.sport_id, sportKey);

  const { data: created, error } = await admin
    .from("backtests")
    .insert({
      model_version_id: modelVersionId,
      league_id: leagueId,
      sport_id: league.sport_id,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      embargo_days: EMBARGO_DAYS,
      sample_size: result.predictions.length,
      brier_score: brier,
      is_significant: false,
      notes:
        "Backtest בודד — p-value/FDR לא מחושבים (דורש batch של מספר ליגות/שווקים בו-זמנית, ראה methodology.md §7.3).",
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "שמירת ה-backtest נכשלה" };
  return { backtestId: (created as { id: string }).id };
}
