"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      <Link href="/admin" className="block text-lg font-bold tracking-tight text-sidebar-foreground">
        Admin
      </Link>
      <nav className="mt-6 flex flex-col gap-0.5 text-sm">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent font-medium text-sidebar-primary"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
