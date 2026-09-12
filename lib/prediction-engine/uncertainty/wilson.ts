/**
 * Wilson score interval — methodology.md §5. Good coverage even at small n
 * and near p=0/1, unlike the naive normal-approximation interval.
 *
 *   p ≈ ( p̂ + z²/2n ± (z/2n)·√(4n·p̂(1−p̂) + z²) ) / (1 + z²/n)
 */

export interface WilsonInterval {
  low: number;
  high: number;
  pointEstimate: number;
}

const Z_95 = 1.959963984540054; // qnorm(0.975)

export function wilsonInterval(
  successes: number,
  n: number,
  z: number = Z_95
): WilsonInterval {
  if (n <= 0) throw new Error("n must be positive");
  if (successes < 0 || successes > n) {
    throw new Error("successes must be between 0 and n");
  }

  const pHat = successes / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = pHat + z2 / (2 * n);
  const margin = (z / (2 * n)) * Math.sqrt(4 * n * pHat * (1 - pHat) + z2);

  return {
    low: Math.max(0, (center - margin) / denominator),
    high: Math.min(1, (center + margin) / denominator),
    pointEstimate: pHat,
  };
}

/**
 * Flags an estimated hit-rate as too noisy to trust — methodology.md §5:
 * "n·p ≥ 10–20 as a rule of thumb for a stable frequency estimate."
 */
export function isReliable(n: number, p: number, threshold = 15): boolean {
  return n * p >= threshold && n * (1 - p) >= threshold;
}
