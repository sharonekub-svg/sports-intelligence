import type { Metadata } from "next";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import AppShell from "@/components/app-shell/app-shell";

// All authenticated app pages are private product surfaces — never indexed.
// proxy.ts already redirects signed-out visitors away from this group;
// pages under it still re-verify the user server-side themselves (and
// re-verify Pro/admin status where relevant) rather than relying on this
// layout or the proxy alone — this layout's own isPro() call is only for
// the nav's "Pro" badges, not an authorization decision.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedUser();
  const pro = user ? await isPro(user.id) : false;

  return (
    <AppShell userEmail={user?.email ?? null} isPro={pro}>
      {children}
    </AppShell>
  );
}
