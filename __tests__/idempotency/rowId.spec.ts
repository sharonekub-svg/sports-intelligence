import { describe, it, expect } from "vitest";
import { deterministicRowId } from "@/lib/idempotency/rowId";

describe("deterministicRowId", () => {
  it("is deterministic — same input always yields the same id", () => {
    const a = deterministicRowId(["2026-09-13", "football", "evt1", "1x2", "home"]);
    const b = deterministicRowId(["2026-09-13", "football", "evt1", "1x2", "home"]);
    expect(a).toBe(b);
  });

  it("differs when any part changes", () => {
    const a = deterministicRowId(["2026-09-13", "football", "evt1", "1x2", "home"]);
    const b = deterministicRowId(["2026-09-13", "football", "evt1", "1x2", "away"]);
    expect(a).not.toBe(b);
  });

  it("is a 32-character hex string", () => {
    const id = deterministicRowId(["x", "y", "z"]);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
