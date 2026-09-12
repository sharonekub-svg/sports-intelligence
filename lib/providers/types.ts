export interface OddsQuoteInput {
  /** Provider-specific sport identifier, e.g. "soccer_epl" for The Odds API. */
  sportKey: string;
  regions?: string[];
  markets?: string[];
}

export interface RawOddsOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface RawOddsMarket {
  key: string;
  outcomes: RawOddsOutcome[];
}

export interface RawOddsBookmaker {
  key: string;
  markets: RawOddsMarket[];
}

export interface RawOddsEvent {
  externalId: string;
  sportKey: string;
  homeTeamName: string;
  awayTeamName: string;
  commenceTime: string;
  bookmakers: RawOddsBookmaker[];
}

export type MatchStatus = "scheduled" | "live" | "final" | "postponed" | "cancelled";

export interface RawScoreEvent {
  externalId: string;
  homeTeamName: string;
  awayTeamName: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  scheduledAt: string;
  leagueExternalRef?: string;
}

export interface ProviderHealth {
  ok: boolean;
  latencyMs: number;
  message?: string;
}

/**
 * lib/providers/*.md architecture note: callers depend on this interface,
 * never on a concrete provider — see providerRegistry.ts. A new source is
 * added by implementing this, registering it, and inserting a
 * `data_sources` row; nothing in lib/jobs or lib/prediction-engine changes.
 */
export interface SportsDataProvider {
  readonly key: string;
  readonly kind: "odds" | "scores" | "both";
  getUpcomingOdds(input: OddsQuoteInput): Promise<RawOddsEvent[]>;
  getResults(sportKey: string, sinceIso: string): Promise<RawScoreEvent[]>;
  getStandings?(leagueKey: string): Promise<unknown>;
  healthCheck(): Promise<ProviderHealth>;
}
