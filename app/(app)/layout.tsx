import type { Metadata } from "next";
import Link from "next/link";

// All authenticated app pages are private product surfaces — never indexed.
// proxy.ts already redirects signed-out visitors away from this group;
// pages under it still re-verify the user server-side themselves (and
// re-verify Pro/admin status where relevant) rather than relying on this
// layout or the proxy alone.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "לוח בקרה" },
  { href: "/scanner", label: "Scanner" },
  { href: "/hidden-opportunities", label: "הזדמנויות נסתרות" },
  { href: "/market-blind-spots", label: "נקודות עיוורות בשוק" },
  { href: "/model-performance", label: "ביצועי המודל" },
  { href: "/saved-matches", label: "משחקים שמורים" },
  { href: "/account", label: "החשבון שלי" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/dashboard" className="text-lg font-bold">
          Sports Intelligence
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
