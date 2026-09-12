import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "./session";
import { AuthError } from "./requirePro";

/**
 * Guard for admin-only route handlers and the /admin layout. Checks
 * `profiles.role === 'admin'` via the service-role client (never trusts a
 * client-supplied role). There is no self-service path to become admin —
 * `role` is set by direct DB action only.
 */
export async function requireAdmin(): Promise<string> {
  const userId = await getVerifiedUserId();
  if (!userId) throw new AuthError(401, "התחברות נדרשת");

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || data.role !== "admin") {
    throw new AuthError(403, "גישה נדחתה");
  }

  return userId;
}
