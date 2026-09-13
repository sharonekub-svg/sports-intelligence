import { describe, it, expect } from "vitest";
import { buildScannerQuery } from "@/lib/api/scannerQuery";
import { scannerFilterSchema } from "@/lib/validation/scanner.schema";
import type { ScannerQueryClient } from "@/lib/api/scannerQuery";

interface RecordedCall {
  table: string;
  method: string;
  args: unknown[];
}

/**
 * Generic recording fake: each `.from(table)` starts a chain that records
 * every call and resolves (via `.maybeSingle()` or as a thenable) to a
 * per-table canned value — enough to drive buildScannerQuery's filter
 * logic without a real Supabase client or a live project.
 */
function createFakeClient(options: {
  sportRow?: { id: string } | null;
  leagueRows?: { id: string }[];
  predictionsData?: unknown[];
}) {
  const calls: RecordedCall[] = [];

  function makeChain(table: string, resolveValue: unknown) {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "gte", "lte", "order", "range"]) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.maybeSingle = async () => {
      calls.push({ table, method: "maybeSingle", args: [] });
      return { data: resolveValue };
    };
    chain.then = (resolve: (value: { data: unknown; error: null }) => void) =>
      resolve({ data: resolveValue, error: null });
    return chain;
  }

  const client: ScannerQueryClient = {
    from(table: string) {
      calls.push({ table, method: "from", args: [] });
      if (table === "sports") return makeChain(table, options.sportRow ?? null);
      if (table === "leagues") return makeChain(table, options.leagueRows ?? []);
      return makeChain(table, options.predictionsData ?? []);
    },
  };

  return { client, calls };
}

function has(calls: RecordedCall[], table: string, method: string, ...args: unknown[]) {
  return calls.some(
    (c) => c.table === table && c.method === method && JSON.stringify(c.args) === JSON.stringify(args)
  );
}

describe("buildScannerQuery", () => {
  it("always filters to actionable predictions, ordered by opportunity score, with pagination", async () => {
    const { client, calls } = createFakeClient({ predictionsData: [] });
    const filters = scannerFilterSchema.parse({});
    await buildScannerQuery(client, filters);

    expect(has(calls, "predictions", "eq", "is_actionable", true)).toBe(true);
    expect(has(calls, "predictions", "order", "opportunity_score", { ascending: false })).toBe(true);
    expect(has(calls, "predictions", "range", 0, 49)).toBe(true);
  });

  it("filters directly by leagueId when given, without resolving sportKey", async () => {
    const { client, calls } = createFakeClient({ predictionsData: [] });
    const leagueId = "11111111-1111-4111-8111-111111111111";
    const filters = scannerFilterSchema.parse({ leagueId });
    await buildScannerQuery(client, filters);

    expect(has(calls, "predictions", "eq", "matches.league_id", leagueId)).toBe(true);
    expect(calls.some((c) => c.table === "sports")).toBe(false);
  });

  it("resolves sportKey to its league ids and filters with .in()", async () => {
    const leagueIds = ["aaa", "bbb"];
    const { client, calls } = createFakeClient({
      sportRow: { id: "sport-1" },
      leagueRows: leagueIds.map((id) => ({ id })),
      predictionsData: [],
    });
    const filters = scannerFilterSchema.parse({ sportKey: "football" });
    await buildScannerQuery(client, filters);

    expect(has(calls, "sports", "eq", "key", "football")).toBe(true);
    expect(has(calls, "leagues", "eq", "sport_id", "sport-1")).toBe(true);
    expect(has(calls, "predictions", "in", "matches.league_id", leagueIds)).toBe(true);
  });

  it("falls back to an impossible id (never 'no filter') when a sport has no leagues", async () => {
    const { client, calls } = createFakeClient({ sportRow: { id: "sport-1" }, leagueRows: [] });
    const filters = scannerFilterSchema.parse({ sportKey: "basketball" });
    await buildScannerQuery(client, filters);

    const inCall = calls.find((c) => c.table === "predictions" && c.method === "in");
    expect(inCall?.args[0]).toBe("matches.league_id");
    expect(inCall?.args[1]).toEqual(["00000000-0000-0000-0000-000000000000"]);
  });

  it("applies confidence/opportunity/data-quality/date filters only when provided", async () => {
    const { client, calls } = createFakeClient({ predictionsData: [] });
    const filters = scannerFilterSchema.parse({
      minConfidence: 0.6,
      minOpportunityScore: 1.5,
      minDataQuality: 0.7,
      dateFrom: "2026-01-01T00:00:00.000Z",
      dateTo: "2026-01-31T00:00:00.000Z",
    });
    await buildScannerQuery(client, filters);

    expect(has(calls, "predictions", "gte", "confidence_score", 0.6)).toBe(true);
    expect(has(calls, "predictions", "gte", "opportunity_score", 1.5)).toBe(true);
    expect(has(calls, "predictions", "gte", "data_quality_score", 0.7)).toBe(true);
    expect(has(calls, "predictions", "gte", "matches.scheduled_at", "2026-01-01T00:00:00.000Z")).toBe(true);
    expect(has(calls, "predictions", "lte", "matches.scheduled_at", "2026-01-31T00:00:00.000Z")).toBe(true);
  });

  it("omits optional filters entirely when not provided (no accidental over-filtering)", async () => {
    const { client, calls } = createFakeClient({ predictionsData: [] });
    const filters = scannerFilterSchema.parse({});
    await buildScannerQuery(client, filters);

    expect(calls.some((c) => c.method === "gte")).toBe(false);
    expect(calls.some((c) => c.method === "lte")).toBe(false);
    expect(calls.some((c) => c.method === "in")).toBe(false);
  });
});

describe("scannerFilterSchema", () => {
  it("rejects an out-of-range confidence value", () => {
    expect(scannerFilterSchema.safeParse({ minConfidence: 1.5 }).success).toBe(false);
  });

  it("rejects a malformed leagueId", () => {
    expect(scannerFilterSchema.safeParse({ leagueId: "not-a-uuid" }).success).toBe(false);
  });

  it("defaults limit and cursor when omitted", () => {
    const parsed = scannerFilterSchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.cursor).toBe(0);
  });

  it("coerces string query-param numbers", () => {
    const parsed = scannerFilterSchema.parse({ minConfidence: "0.5", limit: "10" });
    expect(parsed.minConfidence).toBe(0.5);
    expect(parsed.limit).toBe(10);
  });
});
