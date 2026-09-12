import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description: "מדיניות הפרטיות של פלטפורמת Sports Intelligence.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="text-2xl font-bold">מדיניות פרטיות</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        טיוטה — יש להעביר סקירה משפטית לפני שימוש בפרודקשן.
      </p>

      <h2 className="mt-8 text-lg font-semibold">מידע שאנו אוספים</h2>
      <ul className="mt-3 list-inside list-disc space-y-2">
        <li>פרטי חשבון: אימייל, שם תצוגה (דרך Supabase Auth).</li>
        <li>
          פרטי חיוב: מנוהלים ומאוחסנים על ידי Stripe; אנו שומרים רק סטטוס
          מנוי ומזהי Stripe, לעולם לא פרטי כרטיס אשראי (Stripe הוא ספק חיצוני
          המתמחה בעיבוד תשלומים מאובטח).
        </li>
        <li>
          פעילות שימוש: אירועי אנליטיקס אנונימיים (צפייה במשחקים, שימוש
          ב-Scanner ועוד) לצורך שיפור המוצר.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">כיצד אנו משתמשים במידע</h2>
      <p className="mt-3">
        המידע משמש לצורך הפעלת השירות, ניהול המנוי, ותמיכה במשתמשים. איננו
        מוכרים מידע אישי לצדדים שלישיים.
      </p>

      <h2 className="mt-8 text-lg font-semibold">אבטחת מידע</h2>
      <p className="mt-3">
        גישה למידע מוגבלת באמצעות מדיניות אבטחה ברמת השורה (Row Level
        Security) במסד הנתונים, כך שכל משתמש רואה רק את הנתונים השייכים לו.
        פרטי תשלום מנוהלים אך ורק על ידי Stripe.
      </p>

      <h2 className="mt-8 text-lg font-semibold">זכויות המשתמש</h2>
      <p className="mt-3">
        ניתן לבקש עיון, תיקון או מחיקה של המידע האישי השמור אודותיך דרך עמוד
        החשבון או בפנייה ישירה אלינו.
      </p>
    </article>
  );
}
