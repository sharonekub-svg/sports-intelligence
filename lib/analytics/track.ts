import type { AnalyticsEvent } from "./events";

type Props = Record<string, string | number | boolean | null | undefined>;

/**
 * Client-side event tracking. Provider-agnostic by design (see
 * NEXT_PUBLIC_ANALYTICS_KEY in .env.example) — if a PostHog-style snippet
 * is later added to app/layout.tsx and exposes `window.posthog`, events
 * flow there automatically. Until then this safely no-ops in the browser
 * (server-side events still land in `system_logs` via `serverTrack`, so
 * nothing is silently lost — just not yet in a third-party dashboard).
 */
export function track(event: AnalyticsEvent, props?: Props) {
  if (typeof window === "undefined") return;

  const posthog = (window as unknown as { posthog?: { capture: (e: string, p?: Props) => void } })
    .posthog;
  if (posthog) {
    posthog.capture(event, props);
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, props ?? {});
  }
}
