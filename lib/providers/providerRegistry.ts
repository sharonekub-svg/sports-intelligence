import "server-only";
import type { SportsDataProvider } from "./types";
import { oddsApiProvider } from "./oddsApiProvider";
import { freeScoresProvider } from "./freeScoresProvider";

/**
 * The only place that knows about concrete providers. `lib/jobs/*` and
 * `lib/prediction-engine/*` depend only on `SportsDataProvider` (types.ts)
 * and call through here — adding a third provider (e.g. a paid real-time
 * odds feed later) means implementing the interface, registering it below,
 * and inserting a `data_sources` row, with zero changes anywhere else.
 */
const REGISTRY: SportsDataProvider[] = [oddsApiProvider, freeScoresProvider];

export function getProviders(kind: "odds" | "scores"): SportsDataProvider[] {
  return REGISTRY.filter((p) => p.kind === kind || p.kind === "both");
}

/**
 * Tries each registered provider of the given kind in order, returning the
 * first success. A provider outage degrades to the next one in the chain
 * rather than failing the whole request — callers that also want a
 * last-good-snapshot fallback (when every live provider fails) should
 * catch the rejection this throws and fall back to their own DB read.
 */
export async function withProviderFallback<T>(
  kind: "odds" | "scores",
  call: (provider: SportsDataProvider) => Promise<T>
): Promise<T> {
  const providers = getProviders(kind);
  if (providers.length === 0) {
    throw new Error(`no registered provider for kind "${kind}"`);
  }

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await call(provider);
    } catch (error) {
      errors.push(`${provider.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`all providers failed for kind "${kind}": ${errors.join("; ")}`);
}
