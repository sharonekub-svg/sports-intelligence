import { redirect } from "next/navigation";
import Link from "next/link";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const accuracy = await loadOverallAccuracy();

  return (
    <div>
      <h1 className="text-2xl font-bold">ביצועי המודל</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">דיוק כללי (חי)</CardTitle>
        </CardHeader>
        <CardContent>
          {accuracy ? (
            <p className="text-3xl font-bold">
              {((accuracy.correct / accuracy.total) * 100).toFixed(1)}%
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                ({accuracy.correct}/{accuracy.total} תחזיות שהתיישבו)
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              אין עדיין תחזיות שהתיישבו — המודל טרם צבר תוצאות אמיתיות.
            </p>
          )}
        </CardContent>
      </Card>

      {!pro ? (
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">פירוק מלא זמין למנויי Pro</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Brier Score, Log Loss, Calibration, פירוק לפי ליגה/מודל, ו-Backtests.
            </p>
            <Link href="/account/billing" className={cn(buttonVariants({ size: "sm" }))}>
              שדרג ל-Pro
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold">ביצועים חיים לפי גרסת מודל</h2>
            <p className="text-sm text-muted-foreground">
              מבוסס על תחזיות שהתיישבו בפועל — לא Backtest.
            </p>
            <ModelVersionsTable rows={await loadModelVersions()} />
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">Backtests</h2>
            <p className="text-sm text-muted-foreground">
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
    return <p className="mt-3 text-sm text-muted-foreground">אין עדיין גרסאות מודל רשומות.</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-right text-muted-foreground">
            <th className="py-2">מודל</th>
            <th>ספורט</th>
            <th>סטטוס</th>
            <th>Brier</th>
            <th>Log Loss</th>
            <th>ECE</th>
            <th>גודל מדגם</th>
            <th>עודכן</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b last:border-0">
              <td className="py-2">
                {m.name} {m.version}
              </td>
              <td>{m.sports?.name_he ?? "—"}</td>
              <td>
                <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
              </td>
              <td>{m.brier_score?.toFixed(3) ?? "—"}</td>
              <td>{m.log_loss?.toFixed(3) ?? "—"}</td>
              <td>{m.ece?.toFixed(3) ?? "—"}</td>
              <td>{m.sample_size ?? "—"}</td>
              <td>{m.trained_at ? new Date(m.trained_at).toLocaleDateString("he-IL") : "—"}</td>
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
      <p className="mt-3 text-sm text-muted-foreground">
        אין עדיין הרצות Backtest — ניתן להריץ אחת מ-Admin לאחר צבירת היסטוריה מספקת.
      </p>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-right text-muted-foreground">
            <th className="py-2">ליגה</th>
            <th>טווח</th>
            <th>גודל מדגם</th>
            <th>Brier</th>
            <th>פער ממוצע</th>
            <th>p-value (FDR)</th>
            <th>מובהק?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="py-2">{b.leagues?.name_he ?? "כל הליגות"}</td>
              <td>
                {new Date(b.window_start).toLocaleDateString("he-IL")} –{" "}
                {new Date(b.window_end).toLocaleDateString("he-IL")}
              </td>
              <td>{b.sample_size}</td>
              <td>{b.brier_score?.toFixed(3) ?? "—"}</td>
              <td>{b.mean_edge !== null ? `${(b.mean_edge * 100).toFixed(1)}pp` : "—"}</td>
              <td>{b.fdr_adjusted_p_value?.toFixed(4) ?? "—"}</td>
              <td>
                <Badge variant={b.is_significant ? "default" : "secondary"}>
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
