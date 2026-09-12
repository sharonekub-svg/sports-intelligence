import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchRow {
  id: string;
  scheduled_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
}

interface TeamRow {
  name_he: string;
  name_en: string;
  logo_url: string | null;
}

interface LeagueRow {
  name_he: string;
  name_en: string;
}

interface PublicPredictionRow {
  id: string;
  market: string;
  outcome: string;
  p_model: number;
  generated_at: string;
}

interface FullPredictionRow extends PublicPredictionRow {
  p_market_novig: number | null;
  devig_method: string | null;
  edge: number | null;
  opportunity_score: number | null;
  confidence_score: number | null;
  data_quality_score: number | null;
  wilson_ci_low: number | null;
  wilson_ci_high: number | null;
  is_actionable: boolean;
}

async function loadMatch(id: string) {
  const supabase = await getServerClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, scheduled_at, status, home_score, away_score, league_id, home_team_id, away_team_id")
    .eq("id", id)
    .maybeSingle<MatchRow>();

  if (!match) return null;

  const [{ data: homeTeam }, { data: awayTeam }, { data: league }, { data: publicPredictions }] =
    await Promise.all([
      supabase.from("teams").select("name_he, name_en, logo_url").eq("id", match.home_team_id).maybeSingle<TeamRow>(),
      supabase.from("teams").select("name_he, name_en, logo_url").eq("id", match.away_team_id).maybeSingle<TeamRow>(),
      supabase.from("leagues").select("name_he, name_en").eq("id", match.league_id).maybeSingle<LeagueRow>(),
      supabase
        .from("predictions_public")
        .select("id, market, outcome, p_model, generated_at")
        .eq("match_id", id)
        .returns<PublicPredictionRow[]>(),
    ]);

  return { match, homeTeam, awayTeam, league, publicPredictions: publicPredictions ?? [] };
}

export async function generateMetadata({
  params,
}: PageProps<"/match/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await loadMatch(id);
  if (!data?.homeTeam || !data?.awayTeam) return { title: "משחק" };
  return { title: `${data.homeTeam.name_he} נגד ${data.awayTeam.name_he}` };
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "מתוכנן",
  live: "בשידור חי",
  final: "הסתיים",
  postponed: "נדחה",
  cancelled: "בוטל",
};

export default async function MatchPage({ params }: PageProps<"/match/[id]">) {
  const { id } = await params;
  const data = await loadMatch(id);
  if (!data || !data.homeTeam || !data.awayTeam) notFound();

  const { match, homeTeam, awayTeam, league, publicPredictions } = data;

  const user = await getVerifiedUser();
  const pro = user ? await isPro(user.id) : false;

  let fullPredictions: FullPredictionRow[] = [];
  if (pro) {
    const admin = getAdminClient();
    const { data: full } = await admin
      .from("predictions")
      .select(
        "id, market, outcome, p_model, p_market_novig, devig_method, edge, opportunity_score, confidence_score, data_quality_score, wilson_ci_low, wilson_ci_high, is_actionable, generated_at"
      )
      .eq("match_id", id)
      .returns<FullPredictionRow[]>();
    fullPredictions = full ?? [];
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {league?.name_he ?? "ליגה"} · {new Date(match.scheduled_at).toLocaleString("he-IL")}
            </CardTitle>
            <Badge variant="secondary">{STATUS_LABELS[match.status] ?? match.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-6 py-6 text-xl font-bold">
            <span>{homeTeam.name_he}</span>
            {match.home_score !== null && match.away_score !== null ? (
              <span className="text-2xl">
                {match.home_score} — {match.away_score}
              </span>
            ) : (
              <span className="text-muted-foreground">נגד</span>
            )}
            <span>{awayTeam.name_he}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Model vs Market</CardTitle>
        </CardHeader>
        <CardContent>
          {publicPredictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              עדיין אין תחזית עבור משחק זה — מנוע הניבוי טרם רץ על משחק זה.
            </p>
          ) : pro ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-muted-foreground">
                    <th className="py-2">שוק</th>
                    <th>תוצאה</th>
                    <th>הסתברות מודל</th>
                    <th>הסתברות שוק</th>
                    <th>פער</th>
                    <th>Opportunity</th>
                    <th>Confidence</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {fullPredictions.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{p.market}</td>
                      <td>{p.outcome}</td>
                      <td>{(p.p_model * 100).toFixed(1)}%</td>
                      <td>
                        {p.p_market_novig !== null ? `${(p.p_market_novig * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td>
                        {p.edge !== null
                          ? `${p.edge >= 0 ? "+" : ""}${(p.edge * 100).toFixed(1)} נק'`
                          : "—"}
                      </td>
                      <td>{p.opportunity_score?.toFixed(2) ?? "—"}</td>
                      <td>{p.confidence_score !== null ? `${(p.confidence_score * 100).toFixed(0)}%` : "—"}</td>
                      <td>
                        {p.is_actionable ? (
                          <Badge variant="outline">פעיל</Badge>
                        ) : (
                          <Badge variant="secondary">לא פעיל</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-1 text-sm">
                {publicPredictions.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>
                      {p.market} · {p.outcome}
                    </span>
                    <span>{(p.p_model * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                הפירוק המלא (Model vs Market, Confidence, Data Quality) זמין למנויי Pro בלבד.{" "}
                <a href="/account/billing" className="underline">
                  שדרג
                </a>
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
