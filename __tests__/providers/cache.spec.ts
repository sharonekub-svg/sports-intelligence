import { describe, it, expect, vi, afterEach } from "vitest";
import { cacheGet, cacheSet } from "@/lib/providers/cache";

describe("cache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for a key that was never set", () => {
    expect(cacheGet("nonexistent-key")).toBeUndefined();
  });

  it("returns the value before it expires", () => {
    cacheSet("k1", { hello: "world" }, 5000);
    expect(cacheGet("k1")).toEqual({ hello: "world" });
  });

  it("returns undefined after the TTL elapses", () => {
    vi.useFakeTimers();
    cacheSet("k2", 42, 1000);
    expect(cacheGet("k2")).toBe(42);
    vi.advanceTimersByTime(1001);
    expect(cacheGet("k2")).toBeUndefined();
  });

  it("overwrites an existing key", () => {
    cacheSet("k3", "first", 5000);
    cacheSet("k3", "second", 5000);
    expect(cacheGet("k3")).toBe("second");
  });
});
