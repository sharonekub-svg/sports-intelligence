import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">
          Sports Intelligence
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-6 py-6 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          <Link href="/terms">תנאי שימוש</Link>
          <Link href="/privacy">פרטיות</Link>
          <Link href="/disclaimer">הבהרה</Link>
        </div>
        <p className="mt-3 max-w-2xl">
          כל התחזיות במערכת הן הערכות סטטיסטיות בלבד ואינן מהוות ייעוץ, המלצה
          או הבטחת תוצאה כלשהי. Sports Intelligence היא פלטפורמת אנליטיקה —
          אין באתר הפקדות, משיכות או ביצוע הימורים.
        </p>
      </footer>
    </div>
  );
}
