import "server-only";
import { fetchWithRetry } from "./fetchWithRetry";
import { cacheGet, cacheSet, CACHE_TTL_MS } from "./cache";
import type { MatchStatus, RawScoreEvent, SportsDataProvider } from "./types";

const BASE_URL = "https://webws.365scores.com/web";
const HEADERS = {
  Origin: "https://www.365scores.com",
  Referer: "https://www.365scores.com/",
  "User-Agent": "Mozilla/5.0 (compatible; SportsIntelligenceBot/1.0)",
};

// This provider's own numeric sport ids (independent of our `sports.key`).
const SPORT_ID_BY_KEY: Record<string, number> = {
  football: 1,
  basketball: 2,
};

interface Competitor {
  name: string;
  score?: number;
}
interface Game {
  id: number;
  sportId: number;
  competitionId?: number;
  startTime: string;
  statusGroup: number;
  statusText?: string;
  shortStatusText?: string;
  homeCompetitor: Competitor;
  awayCompetitor: Competitor;
}
interface GamesResponse {
  games: Game[];
}

/**
 * Maps 365scores' own status fields to our MatchStatus. Verified against a
 * real live response (2026-09-12 football snapshot): statusGroup alone is
 * NOT reliable — statusGroup 4 covers both "finished" (shortStatusText
 * "הסתיים") AND "postponed" (shortStatusText "נדחה") in observed data, so
 * the Hebrew status text is checked first. statusGroup 2 ("תוצאת סיום
 * בלבד" — final-score-only tracking) is treated as final; statusGroup 3
 * (with a period indicator like "מח' 2") is live.
 *
 * This is a documented best-effort mapping against one sampled response
 * shape from an unofficial public endpoint, not a guaranteed-stable
 * contract — data_sources health monitoring (see docs/architecture.md)
 * exists specifically to catch drift here, and any status this function
 * can't confidently classify is deliberately left as "scheduled" rather
 * than guessed as final/cancelled.
 */
function mapStatus(game: Game): MatchStatus {
  const text = `${game.statusText ?? ""} ${game.shortStatusText ?? ""}`;
  if (/בוטל|cancelled/i.test(text)) return "cancelled";
  if (/נדחה|postponed|מושהה|suspended/i.test(text)) return "postponed";
  if (game.statusGroup === 4 || game.statusGroup === 2) return "final";
  if (game.statusGroup === 3) return "live";
  return "scheduled";
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * A free, unofficial, no-auth-required scores/results source in the style
 * of 365scores' public web endpoints (kind: "scores"). No CAPTCHA/rate-limit
 * bypass — just browser-like headers on a request the public site itself
 * serves unauthenticated. If the source blocks or reshapes its response,
 * `healthCheck()` reports it and the ingestion job falls back to the last
 * good snapshot (see lib/providers/providerRegistry.ts) rather than
 * attempting evasion.
 */
export const freeScoresProvider: SportsDataProvider = {
  key: "free_scores_provider",
  kind: "scores",

  async getUpcomingOdds() {
    throw new Error("freeScoresProvider does not support getUpcomingOdds — kind is 'scores'");
  },

  async getResults(sportKey: string, sinceIso: string): Promise<RawScoreEvent[]> {
    const sportId = SPORT_ID_BY_KEY[sportKey];
    if (!sportId) throw new Error(`freeScoresProvider: unknown sportKey "${sportKey}"`);

    const since = new Date(sinceIso);
    const today = new Date();
    const cacheKey = `results:${sportKey}:${formatDate(since)}:${formatDate(today)}`;
    const cached = cacheGet<RawScoreEvent[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      langId: "2",
      timezoneName: "Asia/Jerusalem",
      userCountryId: "6",
      appTypeId: "5",
      sports: String(sportId),
      startDate: formatDate(since),
      endDate: formatDate(today),
    });

    const response = await fetchWithRetry(`${BASE_URL}/games/?${params.toString()}`, {
      headers: HEADERS,
    });
    if (!response.ok) {
      throw new Error(`free scores provider request failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as GamesResponse;
    const normalized: RawScoreEvent[] = (data.games ?? []).map((g) => ({
      externalId: String(g.id),
      homeTeamName: g.homeCompetitor.name,
      awayTeamName: g.awayCompetitor.name,
      status: mapStatus(g),
      homeScore: g.homeCompetitor.score,
      awayScore: g.awayCompetitor.score,
      scheduledAt: g.startTime,
      leagueExternalRef: g.competitionId ? String(g.competitionId) : undefined,
    }));

    cacheSet(cacheKey, normalized, CACHE_TTL_MS.standings);
    return normalized;
  },

  async healthCheck() {
    const start = Date.now();
    try {
      const params = new URLSearchParams({
        langId: "2",
        timezoneName: "Asia/Jerusalem",
        userCountryId: "6",
        appTypeId: "5",
        sports: "1",
        startDate: formatDate(new Date()),
        endDate: formatDate(new Date()),
      });
      const response = await fetchWithRetry(
        `${BASE_URL}/games/?${params.toString()}`,
        { headers: HEADERS },
        { attempts: 1 }
      );
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
