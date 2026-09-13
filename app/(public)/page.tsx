import Link from "next/link";
import { GitCompare, Target, Flame, Check, Minus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchCard, type MatchCardData } from "@/components/data/match-card";

const FEATURES = [
  {
    icon: GitCompare,
    title: "Model vs Market",
    body: "השוואה שקופה בין הסתברות מודל סטטיסטי (Elo, Poisson-Dixon/Coles, מודל מרווח) להסתברות המשתמעת מנתוני שוק, אחרי הסרת מרווח הבית.",
  },
  {
    icon: Target,
    title: "Opportunity Score",
    body: "דירוג משחקים לפי איכות הפער — לא רק גודלו — עם התחשבות באי-ודאות, גודל מדגם, וכיול המודל.",
  },
  {
    icon: Flame,
    title: "לוח משחקים יומי",
    body: "20 המשחקים עם הפער האיכותי ביותר מכל העולם, כדורגל וכדורסל, מדורגים ומחולקים לקטגוריות.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "המודל מחשב הסתברות",
    body: "עוצמת קבוצה, פורם עדכני, דירוג Elo ויתרון בית — מעובדים למודל סטטיסטי שקוף לכל משחק.",
  },
  {
    step: "02",
    title: "משווים לשוק, אחרי הסרת מרווח",
    body: "הסתברות השוק מחושבת מיחסי הימור זמינים, לאחר de-vig — לא ההסתברות הגולמית שכוללת את רווח הבית.",
  },
  {
    step: "03",
    title: "מדרגים לפי איכות הפער",
    body: "Opportunity Score משלב את גודל הפער עם Confidence ו-Data Quality — לא מציג פער גדול כהזדמנות אוטומטית.",
  },
];

const COMPARISON_ROWS: { label: string; free: boolean; pro: boolean }[] = [
  { label: "5 ההזדמנויות המובילות", free: true, pro: true },
  { label: "סינון לפי קטגוריה (כדורגל / כדורסל)", free: true, pro: true },
  { label: "20 ההזדמנויות המובילות", free: false, pro: true },
  { label: "Model vs Market מלא לכל משחק + Confidence + Data Quality", free: false, pro: true },
];

const EXAMPLE_MATCH: MatchCardData = {
  matchId: "example",
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
};

export default function Home() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            לא רק לראות את המשחק.
            <br />
            להבין את הנתונים שמאחוריו.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground text-pretty">
            פלטפורמת Sports Intelligence שמנתחת הסתברויות, ביצועי מודל, נתוני
            ליגות ופערים בין תחזית לשוק.
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

        <div className="relative">
          <p className="mb-2 text-center text-xs text-muted-foreground">נתוני הדגמה</p>
          <MatchCard match={EXAMPLE_MATCH} />
        </div>
      </section>

      <section id="how-it-works" className="border-t border-border bg-card/40 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold tracking-tight">איך זה עובד</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step}>
                <span className="font-data text-sm text-primary">{item.step}</span>
                <h3 className="mt-2 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="size-5 text-primary" strokeWidth={1.75} />
                <CardTitle className="mt-2 text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-center text-2xl font-bold tracking-tight">חינם או Pro</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            פתח את שכבת המידע המלאה כשתהיה מוכן.
          </p>
          <div className="mt-8 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="p-3 text-start font-normal text-muted-foreground"></th>
                  <th className="p-3 font-medium">חינם</th>
                  <th className="p-3 font-medium text-primary">Pro</th>
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
                    <td className="p-3 text-center">
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
