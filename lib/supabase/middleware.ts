import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on every matched request and
 * returns the (possibly null) authenticated user. Called from `proxy.ts`.
 *
 * This does NOT itself decide access — it only keeps the session cookie
 * fresh so server components/route handlers see a valid session. Every
 * privileged check (isPro, isAdmin) is re-derived independently server-side
 * per request; this function's `user` is used only for the coarse
 * "redirect signed-out visitors away from (app) routes" decision.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Env not configured yet (e.g. first local run before Supabase project
    // exists) — don't crash every request, just skip session handling.
    return { supabaseResponse, user: null };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
