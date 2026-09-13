import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/app/api/auth/callback/route";

describe("safeNextPath", () => {
  it("accepts a normal relative path", () => {
    expect(safeNextPath("/scanner")).toBe("/scanner");
  });

  it("defaults to /dashboard when null", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
  });

  it("rejects a protocol-relative path (open-redirect vector)", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
  });

  it("rejects an absolute URL to another host", () => {
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
  });

  it("rejects a path not starting with /", () => {
    expect(safeNextPath("evil.com")).toBe("/dashboard");
  });
});
