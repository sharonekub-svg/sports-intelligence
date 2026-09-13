import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, FlaskConical, Lock } from "lucide-react";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { MetricCard } from "@/components/data/metric-card";
import { GapIndicator } from "@/components/data/gap-indicator";
import { TermTooltip } from "@/components/data/term-tooltip";
import { EmptyState } from "@/components/data/empty-state";

interface ModelVersionRow {
  id: string;
  name: string;
  version: string;
  status: string;
  brier_score: number | null;
  log_loss: number | null;
  ece: number | null;
  sample_size: number | null;
  trained_at: string | null;
  sports: { name_he: string } | null;
}

interface BacktestRow {
  id: string;
  window_start: string;
  window_end: string;
  sample_size: number;
  brier_score: number | null;
  mean_edge: number | null;
  fdr_adjusted_p_value: number | null;
  is_significant: boolean;
  leagues: { name_he: string } | null;
}

async function loadOverallAccuracy(): Promise<{ correct: number; total: number } | null> {
  const admin = getAdminClient();
  const { data } = await admin.from("prediction_results").select("status").in("status", ["correct", "incorrect"]);
  if (!data || data.length === 0) return null;
  const correct = data.filter((r: { status: string }) => r.status === "correct").length;
  return { correct, total: data.length };
}

async function loadModelVersions(): Promise<ModelVersionRow[]> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("model_versions")
    .select("id, name, version, status, brier_score, log_loss, ece, sample_size, trained_at, sports(name_he)")
    .returns<ModelVersionRow[]>();
  return data ?? [];
}

async function loadBacktests(): Promise<BacktestRow[]> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("backtests")
    .select(
      "id, window_start, window_end, sample_size, brier_score, mean_edge, fdr_adjusted_p_value, is_significant, leagues(name_he)"
    )
    .order("run_at", { ascending: false })
    .limit(50)
    .returns<BacktestRow[]>();
  return data ?? [];
}

export default async function ModelPerformancePage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  const pro = await isPro(user.id);
  if (pro) await serverTrack(ANALYTICS_EVENTS.PRO_PAGE_VIEW, { page: "model-performance" });

  const accuracy = await loadOverallAccuracy();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">ביצועי המודל</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        מדדי כיול ודיוק, מבוססים על תחזיות שהתיישבו בפועל — בנפרד לגמרי מהרצות Backtest.
      </p>

      <div className="mt-6 max-w-xs">
        <MetricCard
          label="דיוק כללי (חי)"
          value={accuracy ? `${((accuracy.correct / accuracy.total) * 100).toFixed(1)}%` : "—"}
          hint={accuracy ? `${accuracy.correct}/${accuracy.total} תחזיות שהתיישבו` : "אין עדיין תחזיות שהתיישבו"}
        />
      </div>

      {!pro ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" strokeWidth={1.75} />
              <span>Brier Score, Log Loss, Calibration, פירוק לפי ליגה/מודל, ו-Backtests זמינים למנויי Pro.</span>
            </div>
            <Link href="/account/billing" className={cn(buttonVariants({ size: "sm" }))}>
              שדרג ל-Pro
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="mt-10">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" strokeWidth={1.75} />
              <h2 className="text-lg font-semibold tracking-tight">ביצועים חיים לפי גרסת מודל</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">מבוסס על תחזיות שהתיישבו בפועל — לא Backtest.</p>
            <ModelVersionsTable rows={await loadModelVersions()} />
          </section>

          <section className="mt-10">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" strokeWidth={1.75} />
              <h2 className="text-lg font-semibold tracking-tight">Backtests</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              הרצות walk-forward על נתונים היסטוריים — מוצג בנפרד מהביצועים החיים למעלה, ולעולם לא ממוזג
              איתם למספר אחד.
            </p>
            <BacktestsTable rows={await loadBacktests()} />
          </section>
        </>
      )}
    </div>
  );
}

function ModelVersionsTable({ rows }: { rows: ModelVersionRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="אין עדיין גרסאות מודל רשומות"
        description="גרסאות מודל יופיעו כאן לאחר ריצת ה-pipeline הראשונה."
        className="mt-4"
      />
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">מודל</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">ספורט</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">סטטוס</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">
              <TermTooltip term="brierScore">Brier</TermTooltip>
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">
              <TermTooltip term="logLoss">Log Loss</TermTooltip>
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">
              <TermTooltip term="calibration">ECE</TermTooltip>
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">גודל מדגם</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">עודכן</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                {m.name} {m.version}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{m.sports?.name_he ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <Badge
                  variant="outline"
                  className={m.status === "active" ? "border-positive/30 bg-positive/10 text-positive" : ""}
                >
                  {m.status}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{m.brier_score?.toFixed(3) ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{m.log_loss?.toFixed(3) ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{m.ece?.toFixed(3) ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{m.sample_size ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data text-muted-foreground">
                {m.trained_at ? new Date(m.trained_at).toLocaleDateString("he-IL") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BacktestsTable({ rows }: { rows: BacktestRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="אין עדיין הרצות Backtest"
        description="ניתן להריץ הרצה חדשה מ-Admin לאחר צבירת היסטוריה מספקת."
        className="mt-4"
      />
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">ליגה</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">טווח</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">גודל מדגם</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">
              <TermTooltip term="brierScore">Brier</TermTooltip>
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">פער ממוצע</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">p-value (FDR)</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">מובהק?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-3 py-2.5 font-medium">{b.leagues?.name_he ?? "כל הליגות"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data text-muted-foreground">
                {new Date(b.window_start).toLocaleDateString("he-IL")} –{" "}
                {new Date(b.window_end).toLocaleDateString("he-IL")}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{b.sample_size}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{b.brier_score?.toFixed(3) ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {b.mean_edge !== null ? <GapIndicator value={b.mean_edge} /> : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-data">{b.fdr_adjusted_p_value?.toFixed(4) ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <Badge
                  variant="outline"
                  className={b.is_significant ? "border-positive/30 bg-positive/10 text-positive" : "text-muted-foreground"}
                >
                  {b.is_significant ? "כן" : "לא"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
