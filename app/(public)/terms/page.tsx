import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "תנאי שימוש",
  description: "תנאי השימוש בפלטפורמת Sports Intelligence.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="text-2xl font-bold">תנאי שימוש</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        טיוטה — יש להעביר סקירה משפטית לפני שימוש בפרודקשן.
      </p>

      <h2 className="mt-8 text-lg font-semibold">1. השירות</h2>
      <p className="mt-3">
        Sports Intelligence (&ldquo;השירות&rdquo;) מספקת ניתוח אנליטי של
        משחקי ספורט, המבוסס על השוואת הסתברויות מודל סטטיסטי מול נתוני שוק
        ציבוריים. השירות אינו בית הימורים ואינו מבצע פעולות הימור בשם
        המשתמש. ראו את{" "}
        <Link href="/disclaimer" className="underline">
          ההבהרה
        </Link>{" "}
        לפרטים מלאים על אופי התחזיות.
      </p>

      <h2 className="mt-8 text-lg font-semibold">2. חשבון משתמש</h2>
      <p className="mt-3">
        הרשמה לשירות דורשת כתובת אימייל תקינה. המשתמש אחראי לשמירת סודיות
        פרטי ההתחברות שלו ולכל פעולה המתבצעת בחשבונו.
      </p>

      <h2 className="mt-8 text-lg font-semibold">3. מנוי Pro</h2>
      <p className="mt-3">
        חלק מתכני השירות זמינים רק למנויי Pro בתשלום, המחויבים ומנוהלים דרך
        Stripe. ניתן לבטל את המנוי בכל עת דרך עמוד החשבון; הביטול ייכנס לתוקף
        בסוף מחזור החיוב הנוכחי, אלא אם צוין אחרת בעת הביטול.
      </p>

      <h2 className="mt-8 text-lg font-semibold">4. שימוש מותר</h2>
      <p className="mt-3">
        אין להשתמש בשירות לצורך גירוד נתונים (scraping) אוטומטי, עקיפת
        מגבלות טכניות, או שימוש מסחרי בתכני השירות ללא אישור מראש ובכתב.
      </p>

      <h2 className="mt-8 text-lg font-semibold">5. הגבלת אחריות</h2>
      <p className="mt-3">
        השירות מסופק &ldquo;כפי שהוא&rdquo; (AS IS). החברה אינה אחראית לכל נזק, ישיר או
        עקיף, הנובע משימוש בתחזיות או בנתונים המוצגים בשירות, לרבות החלטות
        המתקבלות על בסיסם.
      </p>

      <h2 className="mt-8 text-lg font-semibold">6. יצירת קשר</h2>
      <p className="mt-3">
        לשאלות בנוגע לתנאים אלה, ניתן לפנות דרך פרטי הקשר המפורסמים באתר.
      </p>
    </article>
  );
}
