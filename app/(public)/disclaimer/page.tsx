import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "הבהרה",
  description: "הבהרה חשובה על אופי התחזיות והנתונים באתר Sports Intelligence.",
};

export default function DisclaimerPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="text-2xl font-bold">הבהרה</h1>

      <p className="mt-6">
        Sports Intelligence היא פלטפורמת אנליטיקת ספורט. המערכת מנתחת נתוני
        משחקים ציבוריים ונתוני שוק (יחסי הימור המתפרסמים על ידי גורמים
        חיצוניים), ומחשבת הערכות הסתברות באמצעות מודלים סטטיסטיים שקופים
        (Elo, Poisson, רגרסיה לוגיסטית ומודלים דומים).
      </p>

      <h2 className="mt-8 text-lg font-semibold">מה האתר הזה לא</h2>
      <ul className="mt-3 list-inside list-disc space-y-2">
        <li>האתר אינו בית הימורים ואינו מבצע הימורים בשם המשתמש.</li>
        <li>אין באתר הפקדות כספים, משיכות, או כל פעולת תשלום הקשורה להימור.</li>
        <li>האתר אינו מציע &ldquo;הימור בטוח&rdquo; או הבטחת רווח מכל סוג.</li>
        <li>
          שום תוכן באתר אינו ייעוץ פיננסי, ייעוץ הימורים, או המלצה לפעולה.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">
        מה משמעות &ldquo;הסתברות מודל&rdquo;
      </h2>
      <p className="mt-3">
        כל הסתברות המוצגת באתר — לרבות ציוני Confidence, Data Quality
        ו-Opportunity Score — היא תוצר של חישוב סטטיסטי המבוסס על נתונים
        היסטוריים וזמינים. הסתברות גבוהה אינה ערובה לתוצאה; משחקי ספורט
        כוללים אי-ודאות אינהרנטית שלא ניתן לבטל באמצעות שום מודל.
      </p>
      <p className="mt-3">
        ביצועי עבר של מודל — לרבות כל נתון המוצג תחת &ldquo;ביצועי המודל&rdquo;
        או &ldquo;Backtests&rdquo; — אינם מבטיחים ביצועים עתידיים. מודלים
        מבוססי-נתונים עלולים לטעות, במיוחד בליגות עם מדגם נתונים קטן או
        היסטוריה קצרה.
      </p>

      <h2 className="mt-8 text-lg font-semibold">נתוני הדגמה</h2>
      <p className="mt-3">
        בכל מקום שבו מוצג באתר תוכן לצורך הדגמה בלבד (למשל בשלבי הקמה ראשוניים
        של המערכת, לפני צבירת נתונים אמיתיים מספקים), הדבר יסומן במפורש
        כ&ldquo;נתוני הדגמה&rdquo;. תוכן שאינו מסומן כך משקף חישוב אמיתי על
        נתונים שנאספו בפועל — אך עדיין כפוף לכל ההבהרות שלעיל.
      </p>

      <p className="mt-8 text-sm text-muted-foreground">
        ראו גם את{" "}
        <Link href="/terms" className="underline">
          תנאי השימוש
        </Link>{" "}
        ואת{" "}
        <Link href="/privacy" className="underline">
          מדיניות הפרטיות
        </Link>
        .
      </p>
    </article>
  );
}
