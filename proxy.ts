import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/opportunities", "/match", "/account", "/admin"];

/**
 * Coarse gate only: refreshes the Supabase session and redirects
 * unauthenticated visitors away from app/admin routes to /login.
 *
 * This is NOT where Pro-tier or admin-role authorization happens — those
 * checks (`isPro`, `requireAdmin`) are re-derived server-side in every
 * page/route handler that needs them, per the Next.js 16 guidance that a
 * Proxy matcher change should never be the only thing standing between a
 * request and a privileged action.
 */
export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/stripe/webhook|api/cron).*)",
  ],
};
