"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, Crown } from "lucide-react";
import { MAIN_NAV_ITEMS } from "./nav-items";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface AppShellProps {
  userEmail: string | null;
  isPro: boolean;
  children: React.ReactNode;
}

function NavLinks({ pathname, isPro, onNavigate }: { pathname: string; isPro: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {MAIN_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            {active && (
              <span className="absolute inset-y-1 end-0 w-0.5 rounded-full bg-sidebar-primary" />
            )}
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.proOnly && !isPro && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
                Pro
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ userEmail, isPro }: { userEmail: string | null; isPro: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border-t border-sidebar-border px-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
        {userEmail?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0 flex-1">
        <Link href="/account" className="block truncate text-xs text-sidebar-foreground hover:underline">
          {userEmail ?? "החשבון שלי"}
        </Link>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-sidebar-foreground/50">
          {isPro && <Crown className="size-3 text-sidebar-primary" strokeWidth={2} />}
          <span>{isPro ? "מנוי Pro" : "תוכנית חינמית"}</span>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        aria-label="התנתק"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <LogOut className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

export default function AppShell({ userEmail, isPro, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:flex">
        <div className="px-4 py-5">
          <Link href="/opportunities" className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Sports Intelligence
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <NavLinks pathname={pathname} isPro={isPro} />
        </div>
        <UserFooter userEmail={userEmail} isPro={isPro} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Link href="/opportunities" className="text-sm font-semibold text-sidebar-foreground">
          Sports Intelligence
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="פתח תפריט"
          className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="סגור תפריט"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="תפריט ניווט"
            className="absolute inset-y-0 end-0 flex w-72 flex-col bg-sidebar shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm font-semibold text-sidebar-foreground">Sports Intelligence</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="סגור תפריט"
                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks pathname={pathname} isPro={isPro} onNavigate={() => setMobileOpen(false)} />
            </div>
            <UserFooter userEmail={userEmail} isPro={isPro} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
