/**
 * Independent Poisson goals model (Maher, 1982) — methodology.md §3.1.
 *
 *   λ_home = attack_home · defence_away · homeAdvantage
 *   λ_away = attack_away · defence_home
 *
 * Team attack/defence strengths are fit by iterative proportional fitting
 * (IPF): the Poisson log-likelihood is linear in log(attack_i) holding
 * every other parameter fixed, so each coordinate update has a closed
 * form — this is the same fixed-point structure as fitting a log-linear
 * model with team fixed effects (Sinkhorn-style alternating projections),
 * not an approximation of the true MLE.
 *
 * Call on a rolling window of recent matches (methodology.md recommends
 * 2–4 seasons with mild recency decay — decay weighting is not yet wired
 * in here; `matches` should already be windowed/filtered by the caller).
 */

export interface HistoricalMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface TeamStrengths {
  attack: Record<string, number>;
  defence: Record<string, number>;
  homeAdvantage: number;
}

export function fitTeamStrengths(
  matches: HistoricalMatch[],
  options: { iterations?: number } = {}
): TeamStrengths {
  if (matches.length === 0) throw new Error("matches must be non-empty");
  const { iterations = 200 } = options;

  const teamIds = new Set<string>();
  for (const m of matches) {
    teamIds.add(m.homeTeamId);
    teamIds.add(m.awayTeamId);
  }

  const attack: Record<string, number> = {};
  const defence: Record<string, number> = {};
  for (const id of teamIds) {
    attack[id] = 1;
    defence[id] = 1;
  }
  let homeAdvantage = 1.3;

  const EPS = 1e-9;

  for (let iter = 0; iter < iterations; iter++) {
    // Attack update: attack_i = (goals scored by i) / Σ(opponent defence · [homeAdv if i home])
    const attackNumerator: Record<string, number> = {};
    const attackDenominator: Record<string, number> = {};
    for (const id of teamIds) {
      attackNumerator[id] = 0;
      attackDenominator[id] = 0;
    }
    for (const m of matches) {
      attackNumerator[m.homeTeamId] += m.homeGoals;
      attackDenominator[m.homeTeamId] += defence[m.awayTeamId] * homeAdvantage;
      attackNumerator[m.awayTeamId] += m.awayGoals;
      attackDenominator[m.awayTeamId] += defence[m.homeTeamId];
    }
    for (const id of teamIds) {
      if (attackDenominator[id] > EPS) {
        attack[id] = attackNumerator[id] / attackDenominator[id];
      }
    }

    // Defence update: defence_j = (goals conceded by j) / Σ(opponent attack · [homeAdv if opponent home])
    const defenceNumerator: Record<string, number> = {};
    const defenceDenominator: Record<string, number> = {};
    for (const id of teamIds) {
      defenceNumerator[id] = 0;
      defenceDenominator[id] = 0;
    }
    for (const m of matches) {
      defenceNumerator[m.awayTeamId] += m.homeGoals;
      defenceDenominator[m.awayTeamId] += attack[m.homeTeamId] * homeAdvantage;
      defenceNumerator[m.homeTeamId] += m.awayGoals;
      defenceDenominator[m.homeTeamId] += attack[m.awayTeamId];
    }
    for (const id of teamIds) {
      if (defenceDenominator[id] > EPS) {
        defence[id] = defenceNumerator[id] / defenceDenominator[id];
      }
    }

    // Home advantage update.
    let homeGoalsTotal = 0;
    let expectedDenominator = 0;
    for (const m of matches) {
      homeGoalsTotal += m.homeGoals;
      expectedDenominator += attack[m.homeTeamId] * defence[m.awayTeamId];
    }
    if (expectedDenominator > EPS) {
      homeAdvantage = homeGoalsTotal / expectedDenominator;
    }
  }

  return { attack, defence, homeAdvantage };
}

export function expectedGoals(
  strengths: TeamStrengths,
  homeTeamId: string,
  awayTeamId: string
): { lambdaHome: number; lambdaAway: number } {
  const attackHome = strengths.attack[homeTeamId];
  const defenceHome = strengths.defence[homeTeamId];
  const attackAway = strengths.attack[awayTeamId];
  const defenceAway = strengths.defence[awayTeamId];

  if (
    attackHome === undefined ||
    defenceHome === undefined ||
    attackAway === undefined ||
    defenceAway === undefined
  ) {
    throw new Error("both teams must be present in the fitted strengths");
  }

  return {
    lambdaHome: attackHome * defenceAway * strengths.homeAdvantage,
    lambdaAway: attackAway * defenceHome,
  };
}
