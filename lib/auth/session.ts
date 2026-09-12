import "server-only";
import { getServerClient } from "@/lib/supabase/server";

export interface VerifiedUser {
  id: string;
  email: string | null;
}

/**
 * Returns the current request's verified user, or null.
 *
 * Always uses `auth.getUser()`, never `auth.getSession()` — `getUser()`
 * re-validates the token against the Supabase Auth server on every call,
 * while `getSession()` only reads the (client-writable) cookie payload.
 * This is the one place that should be trusted to say "who is calling";
 * every authorization decision (isPro, isAdmin) builds on top of this id,
 * never on a client-supplied user id from a request body.
 */
export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  const supabase = await getServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
}

export async function getVerifiedUserId(): Promise<string | null> {
  const user = await getVerifiedUser();
  return user?.id ?? null;
}
