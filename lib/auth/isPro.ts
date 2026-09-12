import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

const ACTIVE_STATUSES = ["active", "trialing"] as const;

/**
 * Server-only, always-fresh check of whether a user has an active Pro
 * subscription. Reads `subscriptions` via the service-role client — this
 * table has ZERO client-facing RLS policies (see supabase/migrations),
 * so this function is the only legitimate way to answer "is this user Pro".
 *
 * Never derive Pro status from a client-supplied flag, a JWT custom claim,
 * or a cookie the client could edit. Call this fresh on every request that
 * needs it (server component render AND the API route it calls).
 */
export async function isPro(userId: string): Promise<boolean> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .maybeSingle();

  if (error || !data) return false;

  if (!data.current_period_end) return true;
  return new Date(data.current_period_end).getTime() > Date.now();
}
