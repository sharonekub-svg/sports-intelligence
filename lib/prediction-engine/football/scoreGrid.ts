import { poissonPmf } from "./poissonMath";
import { tau } from "./dixonColes";

/**
 * Builds the full home×away score-probability grid — methodology.md §3.1 —
 * and derives 1X2 / totals / correct-score markets from it. Renormalized
 * to sum to 1 after applying τ, since the Dixon-Coles adjustment on a
 * handful of cells slightly perturbs the total probability mass.
 */
export function buildScoreGrid(
  lambdaHome: number,
  lambdaAway: number,
  rho: number,
  maxGoals = 10
): number[][] {
  const grid: number[][] = [];
  for (let x = 0; x <= maxGoals; x++) {
    const row: number[] = [];
    for (let y = 0; y <= maxGoals; y++) {
      const base = poissonPmf(x, lambdaHome) * poissonPmf(y, lambdaAway);
      row.push(base * tau(x, y, lambdaHome, lambdaAway, rho));
    }
    grid.push(row);
  }

  const total = grid.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
  return grid.map((row) => row.map((p) => p / total));
}

export interface MarketProbabilities {
  oneXTwo: { home: number; draw: number; away: number };
  totals: Record<string, number>;
  correctScore: Record<string, number>;
}

const TOTALS_LINES = [0.5, 1.5, 2.5, 3.5, 4.5];

export function toMarketProbabilities(grid: number[][]): MarketProbabilities {
  let home = 0;
  let draw = 0;
  let away = 0;
  const correctScore: Record<string, number> = {};

  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      const p = grid[x][y];
      if (x > y) home += p;
      else if (x === y) draw += p;
      else away += p;
      correctScore[`${x}-${y}`] = p;
    }
  }

  const totals: Record<string, number> = {};
  for (const line of TOTALS_LINES) {
    let over = 0;
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        if (x + y > line) over += grid[x][y];
      }
    }
    totals[`over_${line}`] = over;
    totals[`under_${line}`] = 1 - over;
  }

  return { oneXTwo: { home, draw, away }, totals, correctScore };
}
