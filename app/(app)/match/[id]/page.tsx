import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Lock, BarChart3 } from "lucide-react";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProbabilityBar } from "@/components/data/probability-bar";
import { GapIndicator } from "@/components/data/gap-indicator";
import { ConfidenceIndicator } from "@/components/data/confidence-indicator";
import { DataQualityIndicator } from "@/components/data/data-quality-indicator";
import { OpportunityScore } from "@/components/data/opportunity-score";
import SaveButton from "./save-button";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

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

const OUTCOME_LABELS: Record<string, string> = { home: "בית", draw: "תיקו", away: "חוץ" };
const MODEL_LABELS: Record<string, string> = {
  "1x2": "Poisson / Dixon-Coles + Elo (אנסמבל)",
  moneyline: "מודל מרווח נקודות + Elo (אנסמבל)",
};

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

export async function generateMetadata({ params }: PageProps<"/match/[id]">): Promise<Metadata> {
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
  await serverTrack(ANALYTICS_EVENTS.MATCH_VIEW, { matchId: id });

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

  const primaryMarket = fullPredictions[0]?.market ?? publicPredictions[0]?.market;
  const primaryFull = fullPredictions.filter((p) => p.market === primaryMarket);
  const primaryPublic = publicPredictions.filter((p) => p.market === primaryMarket);
  const homeFull = primaryFull.find((p) => p.outcome === "home") ?? null;
  const homePublic = primaryPublic.find((p) => p.outcome === "home") ?? null;

  // Flattened, always-nullable values rather than narrowing a
  // FullPredictionRow | PublicPredictionRow union in the JSX below — much
  // simpler than fighting TypeScript's narrowing through `in` checks on
  // two shapes that only differ by which optional fields are present.
  const homeModelProb = homeFull?.p_model ?? homePublic?.p_model ?? null;
  const homeMarketProb = homeFull?.p_market_novig ?? null;
  const homeEdge = homeFull?.edge ?? null;
  const homeConfidence = homeFull?.confidence_score ?? null;
  const homeDataQuality = homeFull?.data_quality_score ?? null;
  const homeOpportunity = homeFull?.opportunity_score ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {league?.name_he ?? "ליגה"} ·{" "}
              <span className="font-data">{new Date(match.scheduled_at).toLocaleString("he-IL")}</span>
            </CardTitle>
            <Badge variant="secondary">{STATUS_LABELS[match.status] ?? match.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-6 py-6 text-xl font-bold">
            <span>{homeTeam.name_he}</span>
            {match.home_score !== null && match.away_score !== null ? (
              <span className="font-data text-2xl">
                {match.home_score} — {match.away_score}
              </span>
            ) : (
              <span className="text-sm font-normal text-muted-foreground">נגד</span>
            )}
            <span>{awayTeam.name_he}</span>
          </div>
          {user && (
            <div className="flex justify-center">
              <SaveButton matchId={match.id} />
            </div>
          )}
        </CardContent>
      </Card>

      {primaryPublic.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            עדיין אין תחזית עבור משחק זה — מנוע הניבוי טרם רץ עליו.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Model vs Market</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {homeModelProb !== null && (
                <>
                  <ProbabilityBar label="הסתברות מודל" value={homeModelProb} variant="model" />
                  {homeMarketProb !== null && (
                    <ProbabilityBar label="הסתברות שוק" value={homeMarketProb} variant="market" />
                  )}
                </>
              )}

              {pro ? (
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">פער</p>
                    {homeEdge !== null && <GapIndicator value={homeEdge} className="mt-1" />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    {homeConfidence !== null && (
                      <div className="mt-1">
                        <ConfidenceIndicator score={homeConfidence} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data Quality</p>
                    {homeDataQuality !== null && (
                      <div className="mt-1">
                        <DataQualityIndicator score={homeDataQuality} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Opportunity</p>
                    {homeOpportunity !== null && (
                      <OpportunityScore value={homeOpportunity} className="mt-1 block" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  <Lock className="size-3.5 shrink-0" strokeWidth={1.75} />
                  <span>
                    פער, Confidence ו-Opportunity Score זמינים למנויי{" "}
                    <Link href="/account/billing" className="text-primary hover:underline">
                      Pro
                    </Link>
                    .
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {pro && fullPredictions.length > 1 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">כל השווקים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-start text-xs text-muted-foreground">
                        <th className="py-2 font-normal">שוק</th>
                        <th className="font-normal">תוצאה</th>
                        <th className="font-normal">מודל</th>
                        <th className="font-normal">שוק</th>
                        <th className="font-normal">פער</th>
                        <th className="font-normal">Opportunity</th>
                        <th className="font-normal">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody className="font-data">
                      {fullPredictions.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-2 font-sans">{p.market}</td>
                          <td className="font-sans">{OUTCOME_LABELS[p.outcome] ?? p.outcome}</td>
                          <td>{(p.p_model * 100).toFixed(1)}%</td>
                          <td className="text-muted-foreground">
                            {p.p_market_novig !== null ? `${(p.p_market_novig * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td>{p.edge !== null ? <GapIndicator value={p.edge} /> : "—"}</td>
                          <td>{p.opportunity_score?.toFixed(2) ?? "—"}</td>
                          <td className="font-sans">
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
              </CardContent>
            </Card>
          )}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-muted-foreground" strokeWidth={1.75} />
                מה משפיע על התחזית?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                התחזית מבוססת על{" "}
                <span className="text-foreground">
                  {MODEL_LABELS[primaryMarket ?? ""] ?? "מודל סטטיסטי"}
                </span>{" "}
                — שילוב של עוצמת קבוצה (התקפה/הגנה, מותאם ליגה), דירוג Elo היסטורי, ויתרון בית. ראו{" "}
                <a
                  href="https://github.com/sharonekub-svg/sports-intelligence/blob/main/docs/methodology.md"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  את המתודולוגיה המלאה
                </a>{" "}
                לפירוט הנוסחאות.
              </p>
            </CardContent>
          </Card>

          {!pro && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                פתח את שכבת המידע המלאה — פירוק מלא, Confidence, Data Quality וכל השווקים.
              </p>
              <Link href="/account/billing" className={cn(buttonVariants({ size: "sm" }))}>
                שדרג ל-Pro
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
