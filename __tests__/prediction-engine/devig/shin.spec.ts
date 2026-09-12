import { describe, it, expect } from "vitest";
import { shinDevig } from "@/lib/prediction-engine/devig/shin";
import { noVigProbability } from "@/lib/prediction-engine/devig/proportional";

describe("shin de-vig", () => {
  it("z=0 collapses exactly to proportional de-vig (the model's no-insider limit)", () => {
    const prices = [1.9, 3.6, 4.2];
    const shin = shinDevig(prices, 0);
    const prop = noVigProbability(prices);
    shin.forEach((p, i) => expect(p).toBeCloseTo(prop[i], 10));
  });

  it("always sums to 1 for z > 0", () => {
    const probs = shinDevig([1.05, 15], 0.03);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("corrects the favorite-longshot bias: shrinks the longshot vs. proportional", () => {
    const prices = [1.05, 15];
    const shin = shinDevig(prices, 0.03);
    const prop = noVigProbability(prices);
    // Shin's insider-trading correction should assign the longshot a LOWER
    // probability than naive proportional de-vig (methodology.md §2.5) and
    // correspondingly raise the favorite's.
    expect(shin[1]).toBeLessThan(prop[1]);
    expect(shin[0]).toBeGreaterThan(prop[0]);
  });

  it("rejects z outside [0, 1)", () => {
    expect(() => shinDevig([2, 2], -0.1)).toThrow();
    expect(() => shinDevig([2, 2], 1)).toThrow();
  });
});
