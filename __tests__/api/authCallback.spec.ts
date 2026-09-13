import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/app/api/auth/callback/route";

describe("safeNextPath", () => {
  it("accepts a normal relative path", () => {
    expect(safeNextPath("/opportunities")).toBe("/opportunities");
  });

  it("defaults to /opportunities when null", () => {
    expect(safeNextPath(null)).toBe("/opportunities");
  });

  it("rejects a protocol-relative path (open-redirect vector)", () => {
    expect(safeNextPath("//evil.com")).toBe("/opportunities");
  });

  it("rejects an absolute URL to another host", () => {
    expect(safeNextPath("https://evil.com")).toBe("/opportunities");
  });

  it("rejects a path not starting with /", () => {
    expect(safeNextPath("evil.com")).toBe("/opportunities");
  });
});
