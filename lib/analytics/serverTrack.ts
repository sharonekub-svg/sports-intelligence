import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AnalyticsEvent } from "./events";

type Props = Record<string, unknown>;

/**
 * Server-side event tracking. Writes a durable `system_logs` row
 * (level='info', source='analytics') so events are never silently lost even
 * before a third-party analytics provider is wired up. Fire-and-forget:
 * never throws, never blocks or fails the calling request.
 */
export async function serverTrack(event: AnalyticsEvent, props?: Props) {
  try {
    const admin = getAdminClient();
    await admin.from("system_logs").insert({
      level: "info",
      source: "analytics",
      message: event,
      context: props ?? {},
    });
  } catch {
    // Analytics must never break the request it's attached to.
  }
}
