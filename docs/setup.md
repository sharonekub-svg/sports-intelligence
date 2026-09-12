# הקמה — מה שהאדם צריך לעשות בעצמו

הריפו מוכן מקצה לקצה בקוד. שום דבר כאן לא בוצע בשמך — כל השלבים הבאים דורשים כניסה אמיתית שלך לחשבונות חיצוניים.

## 1. Supabase

1. צור פרויקט חדש ב-[supabase.com](https://supabase.com) (לא לעשות reuse לפרויקט של hapogea — הסכימות שונות לגמרי).
2. מהגדרות הפרויקט, העתק ל-`.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. קשר את ה-CLI המקומי לפרויקט (מתוך תיקיית הריפו):
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <YOUR_PROJECT_REF>
   ```
4. הפעל את ה-migrations על הפרויקט האמיתי (**לא דורש Docker** — פועל ישירות מול הפרויקט המרוחק):
   ```bash
   pnpm run supabase:push
   ```
5. (אופציונלי) טען את נתוני הייחוס (ספורטים, ליגות, מקורות נתונים):
   ```bash
   pnpm exec supabase db execute -f supabase/seed.sql
   ```
6. צור טיפוסי TypeScript אמיתיים במקום ה-placeholder:
   ```bash
   pnpm exec supabase gen types typescript --project-id <YOUR_PROJECT_REF> > lib/supabase/types.ts
   ```
7. כדי להפוך משתמש קיים למנהל (אין נתיב self-service בכוונה):
   ```sql
   update public.profiles set role = 'admin' where id = '<user-uuid>';
   ```

> **הערה על סביבת הפיתוח שיצרה את הריפו:** לא היה זמין בה Docker, כך שלא הורצה `supabase db reset` מול stack מקומי. ה-SQL נבדק ידנית בעיון (סדר יצירת טבלאות, FK, constraints) אך לא הורץ בפועל מול Postgres. מומלץ להריץ `supabase db reset` מקומית (דורש Docker Desktop) *לפני* `db push` לסביבת production, כבדיקת עשן ראשונה.

## 2. Stripe

1. צור חשבון Stripe (או השתמש בקיים), במצב Test לפני Production.
2. צור Product בשם "Sports Intelligence Pro" עם Price חודשי (subscription).
3. העתק ל-`.env.local`: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_PRO`.
4. לבדיקה מקומית של ה-webhook (לפני שיש דומיין אמיתי):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   יתקבל `STRIPE_WEBHOOK_SECRET` זמני להדבקה ב-`.env.local`.
5. לאחר פריסה ל-Vercel: הוסף Webhook endpoint אמיתי ב-Stripe Dashboard שמצביע ל-`https://<your-domain>/api/stripe/webhook`, והעתק את ה-signing secret הסופי.

## 3. The Odds API

הרשם ב-[the-odds-api.com](https://the-odds-api.com), קבל מפתח, הוסף כ-`ODDS_API_KEY`.

## 4. Vercel

1. צור פרויקט Vercel חדש, חבר לריפו GitHub (את הריפו עצמו צריך ליצור ולדחוף — לא בוצע כאן).
2. הוסף את כל משתני הסביבה מ-`.env.example` בהגדרות הפרויקט.
3. `vercel.json` (ייווצר בשלב ה-Background Jobs) מגדיר את לוחות הזמנים של ה-cron — הם יופעלו אוטומטית עם הפריסה.
4. צור ערך אקראי ל-`CRON_SECRET` והגדר אותו גם ב-Vercel וגם יתאים למה ש-Vercel Cron שולח.

## 5. אופציונלי

- **PostHog** (אנליטיקס): `NEXT_PUBLIC_ANALYTICS_KEY`/`NEXT_PUBLIC_ANALYTICS_HOST`. עד אז, אירועי שרת נשמרים כבר עכשיו ב-`system_logs` (ראו `lib/analytics/serverTrack.ts`).
- **Upstash Redis** (rate limiting): `UPSTASH_REDIS_REST_URL`/`TOKEN` — ייושם בשלב האבטחה.

## 6. אימות end-to-end לפני שמכריזים "מוכן"

1. הרשמת משתמש בדיקה → אישור אימייל → התחברות.
2. רכישת מנוי ב-test mode → ודא ש-`isPro()` הופך `true` (בדוק דרך `/account`).
3. ודא שה-cron jobs רצים בפועל (כרגע אין jobs פעילים — ייבדק אחרי Batch הבא).
4. גלוש בכל נתיב כאורח/Free/Pro/Admin וודא שאין דליפת מידע (למשל צפייה ב-`/admin` כמשתמש רגיל מחזירה 404).
