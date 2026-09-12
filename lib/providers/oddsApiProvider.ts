import "server-only";
import { fetchWithRetry } from "./fetchWithRetry";
import { cacheGet, cacheSet, CACHE_TTL_MS } from "./cache";
import type { OddsQuoteInput, RawOddsEvent, SportsDataProvider } from "./types";

const BASE_URL = "https://api.the-odds-api.com/v4";

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}
interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}
interface OddsApiBookmaker {
  key: string;
  markets: OddsApiMarket[];
}
interface OddsApiEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

/**
 * The Odds API (https://the-odds-api.com) — odds only (kind: "odds").
 * League pool matches the one already proven in hapogea (see
 * supabase/seed.sql for the leagues table this maps into via
 * leagues.provider_key).
 */
export const oddsApiProvider: SportsDataProvider = {
  key: "the_odds_api",
  kind: "odds",

  async getUpcomingOdds(input: OddsQuoteInput): Promise<RawOddsEvent[]> {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) throw new Error("ODDS_API_KEY is not configured");

    const regions = input.regions ?? ["eu", "uk", "us"];
    const markets = input.markets ?? ["h2h"];
    const cacheKey = `odds:${input.sportKey}:${regions.join(",")}:${markets.join(",")}`;

    const cached = cacheGet<RawOddsEvent[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      apiKey,
      regions: regions.join(","),
      markets: markets.join(","),
      oddsFormat: "decimal",
      dateFormat: "iso",
    });

    const response = await fetchWithRetry(
      `${BASE_URL}/sports/${input.sportKey}/odds/?${params.toString()}`,
      undefined,
      { attempts: 3 }
    );

    if (response.status === 401 || response.status === 429) {
      throw new Error(`the-odds-api quota/auth error: HTTP ${response.status}`);
    }
    if (!response.ok) {
      throw new Error(`the-odds-api request failed: HTTP ${response.status}`);
    }

    const events = (await response.json()) as OddsApiEvent[];
    const normalized: RawOddsEvent[] = events.map((e) => ({
      externalId: e.id,
      sportKey: e.sport_key,
      homeTeamName: e.home_team,
      awayTeamName: e.away_team,
      commenceTime: e.commence_time,
      bookmakers: e.bookmakers.map((b) => ({
        key: b.key,
        markets: b.markets.map((m) => ({
          key: m.key,
          outcomes: m.outcomes.map((o) => ({ name: o.name, price: o.price, point: o.point })),
        })),
      })),
    }));

    cacheSet(cacheKey, normalized, CACHE_TTL_MS.oddsHot);
    return normalized;
  },

  async getResults() {
    // Odds-only provider — the registry never routes a getResults() call
    // here (see providerRegistry.ts), this exists only to satisfy the
    // SportsDataProvider interface.
    throw new Error("oddsApiProvider does not support getResults — kind is 'odds'");
  },

  async healthCheck() {
    const start = Date.now();
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return { ok: false, latencyMs: 0, message: "ODDS_API_KEY not configured" };
    }
    try {
      const response = await fetchWithRetry(`${BASE_URL}/sports/?apiKey=${apiKey}`, undefined, {
        attempts: 1,
      });
      return {
        ok: response.ok,
        latencyMs: Date.now() - start,
        message: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
