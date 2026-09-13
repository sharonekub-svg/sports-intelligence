import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { href: "/terms", label: "תנאי שימוש" },
  { href: "/privacy", label: "פרטיות" },
  { href: "/disclaimer", label: "הבהרה" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="text-base font-bold tracking-tight">
            Sports Intelligence
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              התחברות
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
              התחל בחינם
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Sports Intelligence</span>
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            כל התחזיות במערכת הן הערכות סטטיסטיות בלבד ואינן מהוות ייעוץ, המלצה
            או הבטחת תוצאה כלשהי. Sports Intelligence היא פלטפורמת אנליטיקה —
            אין באתר הפקדות, משיכות או ביצוע הימורים.
          </p>
        </div>
      </footer>
    </div>
  );
}
