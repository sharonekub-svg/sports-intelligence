import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * RLS-respecting Supabase client for use in Server Components, Server
 * Actions, and Route Handlers. Reads/writes the auth session via cookies.
 *
 * This client acts AS THE CURRENT USER (or anon) — it is subject to RLS.
 * Never use it to read/write `subscriptions`, `stripe_events`, or other
 * service-only tables; use `getAdminClient()` from `./admin` for those,
 * after independently verifying the caller via `getVerifiedUserId()`.
 */
export async function getServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component (not a Route Handler/Server
          // Action) — cookies can't be set here. Session refresh already
          // happens in proxy.ts, so this is safe to ignore.
        }
      },
    },
  });
}
