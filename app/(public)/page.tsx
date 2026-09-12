import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "Model vs Market",
    body: "השוואה שקופה בין הסתברות מודל סטטיסטי (Elo, Poisson, רגרסיה לוגיסטית) להסתברות המשתמעת מנתוני שוק, אחרי הסרת מרווח הבית (de-vig).",
  },
  {
    title: "Opportunity Score",
    body: "דירוג משחקים לפי איכות הפער — לא רק גודלו — עם התחשבות באי-ודאות, גודל מדגם, וכיול המודל.",
  },
  {
    title: "סריקה רחבה",
    body: "כדורגל וכדורסל, מהליגות הגדולות ועד ליגות פחות מוכרות, עם ציון Data Quality שקוף לכל משחק.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          פלטפורמת אנליטיקת ספורט
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          משווים הסתברות מודל מול נתוני שוק, ומזהים פערים אנליטיים מעניינים —
          עם כל ההסתייגויות הסטטיסטיות בגלוי.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
            התחל בחינם
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            התחברות
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          זוהי פלטפורמת אנליטיקה בלבד — ללא הימורים, ללא הפקדות, ללא הבטחת
          תוצאה.
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-4 pb-20 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {feature.body}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
