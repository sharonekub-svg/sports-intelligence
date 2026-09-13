import "server-only";

/**
 * Fail-closed by design: if CRON_SECRET isn't configured, every cron route
 * rejects (never "open by default"). Vercel Cron automatically sends
 * `Authorization: Bearer <CRON_SECRET>` on scheduled invocations once that
 * env var is set on the project — see docs/setup.md.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
