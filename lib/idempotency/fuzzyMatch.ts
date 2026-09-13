/**
 * Fuzzy match-result pairing — a simplified port of hapogea's
 * `resultMatchScore()` pattern (weighted score across team-name similarity
 * and kickoff time, thresholded). Simplified from hapogea's 5-factor
 * formula (home 0.34 + away 0.34 + league 0.12 + kickoff-hour 0.10 +
 * full-name similarity 0.10) to 3 factors, since callers here already
 * scope candidates to a single league before calling this — there's no
 * separate "league name" text signal to weigh in. Documented simplification,
 * not a silent one.
 */

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      matrix[i][j] =
        a[i - 1] === b[j - 1]
          ? matrix[i - 1][j - 1]
          : 1 + Math.min(matrix[i - 1][j - 1], matrix[i - 1][j], matrix[i][j - 1]);
    }
  }
  return matrix[rows - 1][cols - 1];
}

export function stringSimilarity(a: string, b: string): number {
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(normA, normB) / maxLen;
}

export interface FuzzyMatchCandidate {
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
}

export function matchScore(a: FuzzyMatchCandidate, b: FuzzyMatchCandidate): number {
  const homeSim = stringSimilarity(a.homeTeamName, b.homeTeamName);
  const awaySim = stringSimilarity(a.awayTeamName, b.awayTeamName);
  const hourMatch = new Date(a.scheduledAt).getUTCHours() === new Date(b.scheduledAt).getUTCHours() ? 1 : 0;
  return homeSim * 0.4 + awaySim * 0.4 + hourMatch * 0.2;
}

export const FUZZY_MATCH_THRESHOLD = 0.75;

export function isLikelyMatch(a: FuzzyMatchCandidate, b: FuzzyMatchCandidate): boolean {
  return matchScore(a, b) >= FUZZY_MATCH_THRESHOLD;
}

/** Picks the best-scoring candidate above the threshold, or null. */
export function findBestMatch<T extends FuzzyMatchCandidate>(
  target: FuzzyMatchCandidate,
  candidates: T[]
): T | null {
  let best: { candidate: T; score: number } | null = null;
  for (const candidate of candidates) {
    const score = matchScore(target, candidate);
    if (score >= FUZZY_MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { candidate, score };
    }
  }
  return best?.candidate ?? null;
}
