import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: "/admin", label: "סקירה" },
  { href: "/admin/matches", label: "משחקים" },
  { href: "/admin/leagues", label: "ליגות" },
  { href: "/admin/teams", label: "קבוצות" },
  { href: "/admin/predictions", label: "תחזיות" },
  { href: "/admin/models", label: "מודלים" },
  { href: "/admin/backtests", label: "Backtests" },
  { href: "/admin/data-sources", label: "מקורות נתונים" },
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/subscriptions", label: "מנויים" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/data-health", label: "בריאות נתונים" },
];

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
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-l px-4 py-6">
        <Link href="/admin" className="block text-lg font-bold">
          Admin
        </Link>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
