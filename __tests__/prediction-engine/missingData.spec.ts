import { describe, it, expect } from "vitest";
import { classifyMissingness, isActionable } from "@/lib/prediction-engine/missingData";

describe("classifyMissingness", () => {
  it("classifies a suspended market as MNAR", () => {
    expect(classifyMissingness({ reason: "market_suspended" })).toBe("MNAR");
  });

  it("classifies an unknown lineup as MNAR", () => {
    expect(classifyMissingness({ reason: "unknown_lineup" })).toBe("MNAR");
  });

  it("classifies a provider outage gap as MCAR", () => {
    expect(classifyMissingness({ reason: "provider_gap" })).toBe("MCAR");
  });

  it("defaults an unrecognized reason to MAR (conservative — not silently MCAR)", () => {
    expect(classifyMissingness({ reason: "something_new" })).toBe("MAR");
    expect(classifyMissingness({})).toBe("MAR");
  });
});

describe("isActionable", () => {
  it("MNAR is never actionable", () => {
    expect(isActionable("MNAR")).toBe(false);
  });

  it("MCAR and MAR remain actionable", () => {
    expect(isActionable("MCAR")).toBe(true);
    expect(isActionable("MAR")).toBe(true);
  });
});
