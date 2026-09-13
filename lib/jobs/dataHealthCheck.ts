import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getProviders } from "@/lib/providers/providerRegistry";
import type { JobResult } from "./jobRunner";

export async function dataHealthCheck(): Promise<JobResult> {
  const admin = getAdminClient();
  const providers = [...getProviders("odds"), ...getProviders("scores")];
  const uniqueProviders = Array.from(new Map(providers.map((p) => [p.key, p])).values());

  let processed = 0;
  let updated = 0;

  for (const provider of uniqueProviders) {
    processed++;
    const health = await provider.healthCheck();
    const nowIso = new Date().toISOString();

    const update: Record<string, unknown> = { status: health.ok ? "healthy" : "down", last_checked_at: nowIso };
    if (health.ok) update.last_success_at = nowIso;

    const { error } = await admin.from("data_sources").update(update).eq("key", provider.key);
    if (!error) updated++;

    if (!health.ok) {
      await admin.from("system_logs").insert({
        level: "warn",
        source: "data-health-check",
        message: `provider ${provider.key} health check failed`,
        context: { message: health.message ?? null, latencyMs: health.latencyMs },
      });
    }
  }

  return { rowsProcessed: processed, rowsUpdated: updated };
}
