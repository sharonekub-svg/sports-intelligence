import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser Supabase client for Client Components (login/signup forms, etc.).
 * Subject to RLS like any anon/authenticated client — never a source of
 * truth for authorization decisions (those are always re-derived server-side).
 */
export function getBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
