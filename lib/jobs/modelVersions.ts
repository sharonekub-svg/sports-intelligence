import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

const MODEL_NAME_BY_SPORT: Record<string, string> = {
  football: "poisson-dixon-coles-elo-ensemble",
  basketball: "margin-model-elo-ensemble",
};

/** Get-or-create the single "active" model version for a sport (v1). */
export async function getOrCreateActiveModelVersion(sportId: string, sportKey: string): Promise<string> {
  const admin = getAdminClient();
  const name = MODEL_NAME_BY_SPORT[sportKey] ?? `ensemble-${sportKey}`;

  const { data: existing } = await admin
    .from("model_versions")
    .select("id")
    .eq("sport_id", sportId)
    .eq("name", name)
    .eq("version", "v1")
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await admin
    .from("model_versions")
    .insert({ sport_id: sportId, name, version: "v1", status: "active" })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(`failed to create model_version for sport ${sportKey}: ${error?.message}`);
  }
  return (created as { id: string }).id;
}
