import { describe, it, expect } from "vitest";
import {
  stringSimilarity,
  matchScore,
  isLikelyMatch,
  findBestMatch,
} from "@/lib/idempotency/fuzzyMatch";

describe("stringSimilarity", () => {
  it("is 1 for identical strings (case-insensitive)", () => {
    expect(stringSimilarity("Arsenal", "arsenal")).toBe(1);
  });

  it("is 0 for completely different strings of equal length", () => {
    expect(stringSimilarity("abc", "xyz")).toBe(0);
  });

  it("is high for a minor spelling variant", () => {
    expect(stringSimilarity("Manchester United", "Manchester Utd")).toBeGreaterThan(0.7);
  });
});

describe("matchScore / isLikelyMatch", () => {
  const target = { homeTeamName: "Arsenal", awayTeamName: "Chelsea", scheduledAt: "2026-09-13T18:00:00Z" };

  it("scores a near-identical fixture very high", () => {
    const candidate = { homeTeamName: "Arsenal", awayTeamName: "Chelsea", scheduledAt: "2026-09-13T18:05:00Z" };
    expect(matchScore(target, candidate)).toBeGreaterThan(0.95);
    expect(isLikelyMatch(target, candidate)).toBe(true);
  });

  it("does not match a clearly different fixture", () => {
    const candidate = { homeTeamName: "Everton", awayTeamName: "Fulham", scheduledAt: "2026-09-14T12:00:00Z" };
    expect(isLikelyMatch(target, candidate)).toBe(false);
  });

  it("still matches when only the kickoff hour differs slightly within the same hour bucket", () => {
    const candidate = { homeTeamName: "Arsenal", awayTeamName: "Chelsea", scheduledAt: "2026-09-13T18:45:00Z" };
    expect(isLikelyMatch(target, candidate)).toBe(true);
  });
});

describe("findBestMatch", () => {
  it("picks the highest-scoring candidate above threshold", () => {
    const target = { homeTeamName: "Arsenal", awayTeamName: "Chelsea", scheduledAt: "2026-09-13T18:00:00Z" };
    const candidates = [
      { id: "wrong", homeTeamName: "Everton", awayTeamName: "Fulham", scheduledAt: "2026-09-14T12:00:00Z" },
      { id: "right", homeTeamName: "Arsenal", awayTeamName: "Chelsea", scheduledAt: "2026-09-13T18:10:00Z" },
    ];
    const best = findBestMatch(target, candidates);
    expect(best?.id).toBe("right");
  });

  it("returns null when nothing clears the threshold", () => {
    const target = { homeTeamName: "Arsenal", awayTeamName: "Chelsea", scheduledAt: "2026-09-13T18:00:00Z" };
    const candidates = [
      { id: "a", homeTeamName: "Everton", awayTeamName: "Fulham", scheduledAt: "2026-09-14T12:00:00Z" },
    ];
    expect(findBestMatch(target, candidates)).toBeNull();
  });
});
