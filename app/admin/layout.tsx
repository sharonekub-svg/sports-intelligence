import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/auth/session";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Coarse admin gate for the whole /admin tree. Every /api/admin/* route
 * handler independently repeats this check (requireAdmin()) — a route
 * handler doesn't inherit a layout's guard, so this alone is not sufficient
 * for the API surface, only for page rendering.
 *
 * 404s (not a redirect) on failure so the route's existence isn't
 * confirmed to a non-admin visitor.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) notFound();

  const admin = getAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!data || data.role !== "admin") notFound();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-56 shrink-0 border-e border-border bg-sidebar px-4 py-6">
        <AdminNav />
      </aside>
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
