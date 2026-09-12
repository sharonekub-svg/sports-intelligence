import "server-only";
import { getVerifiedUserId } from "./session";
import { isPro } from "./isPro";

export class AuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Guard for Pro-only route handlers. Throws AuthError(401) if not signed
 * in, AuthError(403) if signed in but not Pro. Callers should catch this
 * and translate to an HTTP response — see app/api/scanner/route.ts for the
 * canonical pattern. Also call this (or `isPro` directly) at the top of any
 * Pro-only Server Component — never rely on proxy.ts alone.
 */
export async function requirePro(): Promise<string> {
  const userId = await getVerifiedUserId();
  if (!userId) throw new AuthError(401, "התחברות נדרשת");

  const pro = await isPro(userId);
  if (!pro) throw new AuthError(403, "נדרש מנוי Pro");

  return userId;
}

export async function requireUser(): Promise<string> {
  const userId = await getVerifiedUserId();
  if (!userId) throw new AuthError(401, "התחברות נדרשת");
  return userId;
}
