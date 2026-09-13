import Link from "next/link";
import { Lock } from "lucide-react";
import { GapIndicator } from "./gap-indicator";
import { ConfidenceIndicator } from "./confidence-indicator";
import { DataQualityIndicator } from "./data-quality-indicator";
import { OpportunityScore } from "./opportunity-score";

export interface MatchCardData {
  matchId: string;
  leagueName: string;
  scheduledAt: string;
  homeTeamName: string;
  awayTeamName: string;
  pModel: number;
  pMarket: number;
  gap: number;
  confidence: number;
  dataQuality: number;
  opportunityScore: number;
}

/**
 * The core visual product surface — per the spec's hierarchy, the
 * gap/confidence/data-quality/opportunity numbers are what a user scans
 * first, teams and league are context. Hover: subtle elevation + border
 * highlight, no bounce/scale theatrics.
 */
export function MatchCard({ match, locked = false }: { match: MatchCardData; locked?: boolean }) {
  const body = (
    <>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{match.leagueName}</span>
        <span>
          {new Date(match.scheduledAt).toLocaleString("he-IL", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-base font-semibold">
        <span className="truncate">{match.homeTeamName}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">נגד</span>
        <span className="truncate">{match.awayTeamName}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-muted-foreground">מודל</p>
          <p className="font-data text-lg font-semibold">{Math.round(match.pModel * 100)}%</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">שוק</p>
          <p className="font-data text-lg font-semibold text-muted-foreground">
            {Math.round(match.pMarket * 100)}%
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">פער</p>
          <GapIndicator value={match.gap} />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Opportunity</p>
          <OpportunityScore value={match.opportunityScore} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <ConfidenceIndicator score={match.confidence} />
        <DataQualityIndicator score={match.dataQuality} />
      </div>
    </>
  );

  if (locked) {
    return (
      <Link
        href="/account/billing"
        className="group relative block overflow-hidden rounded-lg border border-dashed border-border bg-card p-4 transition-all hover:border-primary/40"
      >
        <div className="pointer-events-none select-none opacity-50 blur-[3px]">{body}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-card/50 text-center">
          <Lock className="size-5 text-primary" strokeWidth={1.75} />
          <span className="text-xs font-medium text-foreground">שדרג ל-Pro לצפייה</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/match/${match.matchId}`}
      className="group block rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20"
    >
      {body}
    </Link>
  );
}
