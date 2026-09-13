import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchCard, type MatchCardData } from "@/components/data/match-card";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "המודל מחשב הסתברות",
    body: "עוצמת קבוצה, פורם עדכני, דירוג Elo ויתרון בית — מעובדים למודל סטטיסטי שקוף לכל משחק, כדורגל וכדורסל.",
  },
  {
    step: "02",
    title: "משווים לשוק, אחרי הסרת מרווח",
    body: "הסתברות השוק מחושבת מיחסי הימור זמינים, לאחר de-vig — לא ההסתברות הגולמית שכוללת את רווח הבית.",
  },
  {
    step: "03",
    title: "מדרגים ומרכיבים לוח משחקים",
    body: "20 המשחקים עם הפער האיכותי ביותר, מכל העולם, מקובצים לקטגוריות ומדורגים לפי Opportunity Score.",
  },
];

const COMPARISON_ROWS: { label: string; free: boolean; pro: boolean }[] = [
  { label: "5 ההזדמנויות המובילות", free: true, pro: true },
  { label: "סינון לפי קטגוריה (כדורגל / כדורסל)", free: true, pro: true },
  { label: "20 ההזדמנויות המובילות", free: false, pro: true },
  { label: "Model vs Market מלא לכל משחק + Confidence + Data Quality", free: false, pro: true },
];

const EXAMPLE_MATCHES: MatchCardData[] = [
  {
    matchId: "example-1",
    leagueName: "לדוגמה — פרמייר ליג",
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    homeTeamName: "קבוצה א",
    awayTeamName: "קבוצה ב",
    pModel: 0.68,
    pMarket: 0.54,
    gap: 0.14,
    confidence: 0.82,
    dataQuality: 91,
    opportunityScore: 1.87,
  },
  {
    matchId: "example-2",
    leagueName: "לדוגמה — Euroleague",
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    homeTeamName: "קבוצה ג",
    awayTeamName: "קבוצה ד",
    pModel: 0.57,
    pMarket: 0.49,
    gap: 0.08,
    confidence: 0.71,
    dataQuality: 84,
    opportunityScore: 1.21,
  },
];

const EXAMPLE_LOCKED: MatchCardData = {
  matchId: "example-3",
  leagueName: "לדוגמה — La Liga",
  scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  homeTeamName: "קבוצה ה",
  awayTeamName: "קבוצה ו",
  pModel: 0.61,
  pMarket: 0.52,
  gap: 0.09,
  confidence: 0.68,
  dataQuality: 79,
  opportunityScore: 1.05,
};

export default function Home() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:py-24">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            לא רק לראות את המשחק.
            <br />
            להבין את הנתונים שמאחוריו.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground text-pretty">
            כל יום, 20 המשחקים עם הפער האיכותי ביותר בין המודל לשוק — מכל העולם,
            כדורגל וכדורסל — מדורגים בלוח משחקים אחד.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
              התחל בחינם
            </Link>
            <Link href="#how-it-works" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              ראה איך זה עובד
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            פלטפורמת אנליטיקה בלבד — ללא הימורים, ללא הפקדות, ללא הבטחת תוצאה.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-x-3 top-6 -z-10 rounded-lg border border-border/60 bg-card/40 opacity-70" style={{ height: "calc(100% - 1.5rem)" }} />
          <div className="rounded-lg border border-border bg-card p-1 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-3 pb-2 pt-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">נתוני הדגמה</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-positive" />
                לוח משחקים חי
              </span>
            </div>
            <MatchCard match={EXAMPLE_MATCHES[0]} />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-border bg-card/40 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold tracking-tight">איך זה עובד</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="border-t-2 border-primary/40 pt-4">
                <span className="font-data text-2xl font-semibold text-primary">{item.step}</span>
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight">לוח המשחקים שלך</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          5 מתוך ה-20 ההזדמנויות המובילות פתוחות בחינם. השאר נעולות עד שדרוג ל-Pro — בלי לנחש מה מסתתר מאחורי הנעילה.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLE_MATCHES.map((match) => (
            <MatchCard key={match.matchId} match={match} />
          ))}
          <MatchCard match={EXAMPLE_LOCKED} locked />
        </div>
      </section>

      <section className="border-t border-border bg-card/40 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-center text-2xl font-bold tracking-tight">חינם או Pro</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            תוכנית אחת, ללא הגבלות מבלבלות.
          </p>
          <div className="mt-8 overflow-hidden rounded-lg border border-border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-start font-normal text-muted-foreground"></th>
                  <th className="p-3 font-medium">חינם</th>
                  <th className="rounded-t-lg bg-primary/10 p-3 font-medium text-primary">
                    Pro
                    <span className="mt-1 block text-[10px] font-normal uppercase tracking-wide text-primary/70">
                      מומלץ
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="p-3 text-muted-foreground">{row.label}</td>
                    <td className="p-3 text-center">
                      {row.free ? (
                        <Check className="mx-auto size-4 text-positive" strokeWidth={2} />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/40" strokeWidth={2} />
                      )}
                    </td>
                    <td className="bg-primary/5 p-3 text-center">
                      {row.pro ? (
                        <Check className="mx-auto size-4 text-positive" strokeWidth={2} />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/40" strokeWidth={2} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-center">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
              התחל בחינם
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
