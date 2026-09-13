# ארכיטקטורה

מסמך תכנון מלא (טבלאות, RLS, jobs, עמודים) נמצא בפלט התכנון שממנו נבנה הריפו; המסמך הזה הוא תמצית עדכנית ל-reference מהיר. למתודולוגיה הסטטיסטית המלאה ראו `docs/methodology.md`.

## Stack
Next.js 16 (App Router, Turbopack, TypeScript strict) · Supabase (Postgres + Auth + RLS) · Stripe · Tailwind v4 + shadcn/ui (RTL) · Zod · Vercel Cron · Vitest · pnpm.

**הערה חשובה על Next.js 16:** קובץ ה-middleware נקרא כאן `proxy.ts` (לא `middleware.ts`) ומייצא פונקציה בשם `proxy` — זהו שינוי שם מכוון של Next.js 16 (ה-runtime תמיד Node.js, אין תמיכה ב-edge runtime). כל `cookies()`/`headers()`/`params`/`searchParams` הם async בלבד.

## מבנה תיקיות
```
app/(public)/     עמודים ציבוריים: landing, legal, auth forms
app/(app)/        עמודים מחוברים: dashboard, scanner, match, וכו' — noindex
app/admin/        פאנל ניהול, role-gated
app/api/          route handlers: auth callback, stripe, scanner, cron jobs
lib/supabase/     server.ts (RLS, cookie-based) / admin.ts (service-role) / browser.ts / middleware.ts
lib/auth/         session.ts, isPro.ts, requirePro.ts, requireAdmin.ts
lib/prediction-engine/   מודולים טהורים — ראו docs/methodology.md סעיף 13
lib/providers/    SportsDataProvider abstraction (טרם מומש — Batch הבא)
lib/jobs/         לוגיקת ה-cron jobs, ללא תלות ב-Next (ניתנים לבדיקת יחידה)
supabase/migrations/   init_schema → rls → functions
```

## עקרונות אבטחה קבועים
- **isPro/isAdmin נגזרים מחדש בכל בקשה**, שרת בלבד (`lib/auth/isPro.ts`, `requireAdmin.ts`) — לעולם לא cookie/JWT claim שהלקוח קובע.
- **`subscriptions`, `stripe_events`, `predictions`, `backtests`** — RLS מופעל וללא policy כלל ללקוח (חסימה מוחלטת חוץ מ-service-role). ראו `supabase/migrations/20260101000100_rls.sql`.
- **`lib/supabase/admin.ts`** מסומן `server-only` — ניסיון import מקומפוננטת client הוא שגיאת build.

## מצב נוכחי (אחרי Batch 3)
בוצע:
- **Batch 1**: Architecture, Design System (Tailwind/shadcn RTL), Database (schema+RLS+triggers), Auth. מיושם ונבדק חי מול פרויקט Supabase אמיתי.
- **Batch 2**: Data Providers + Prediction Engine מלא (`lib/prediction-engine/`) — 139 unit tests. `/match/[id]` בנוי מול הסכימה האמיתית. `pnpm verify:engine` מריץ את המנוע קצה-לקצה.
- **Batch 3**: חיבור מלא ל-jobs אמיתיים (`lib/jobs/`: ingestMatches, refreshOdds, refreshScores, generatePredictions, updateResults, recomputeModelPerformance, dataHealthCheck) + `lib/jobs/jobRunner.ts` (רישום ל-`ingestion_runs`/`system_logs`) + `lib/jobs/cronAuth.ts` (fail-closed, בודק `CRON_SECRET`) + 7 route handlers תחת `app/api/cron/*` + `vercel.json`. **כל 7 ה-cron routes נבדקו חי** מול הפרויקט האמיתי עם `CRON_SECRET` אמיתי — כולם מחזירים JSON תקין (401 בלי הרשאה, 200/500 עם), ו-`data-health-check` אכן עדכן את `data_sources` (the_odds_api→down כי אין מפתח, free_scores_provider→healthy עם תגובה אמיתית). Scanner (`/api/scanner` + `lib/api/scannerQuery.ts` — לוגיקת בניית השאילתה מופרדת ונבדקת ב-unit tests גנריים עם fake client, לא רק ידנית), Hidden Opportunities, Market Blind Spots (אגרגציה בקוד היישום לפי ליגה — ECE/Brier/פער חציוני/ממוצע), Model Performance (מפריד בבירור בין ביצועים חיים ל-Backtests — לעולם לא ממוזג), Saved Matches (RLS-scoped client, לא admin — self-row policy אמיתי אוכף). **164 unit/integration tests עוברים.**

פישוטים מתועדים ב-v1 (לא באגים סמויים): התאמת קבוצות ב-`ingestMatches`/`teamResolution.ts` היא exact-match לא-רגיש-לרישיות (לא ה-fuzzy matching המלא של hapogea); `fuzzyMatch.ts` הוא גרסה מפושטת ל-3 גורמים (במקום 5 של hapogea); Elo מחושב מחדש בכל הרצת `generatePredictions` (לא persisted incrementally); יעילות נטו בכדורסל היא proxy מבוסס נקודות-למשחק (אין עדיין נתוני pace/possessions); "הזדמנויות נסתרות" מדורגות לפי Opportunity Score בלבד (אין עדיין איתות "תשומת לב ציבורית" אמיתי).

- **Batch 4**: Stripe מלא — `lib/stripe/client.ts`, `lib/stripe/webhookHandlers.ts` (event routing, נבדק ב-unit tests עם fake DB client: כל סוגי האירועים + מקרה קצה של subscription לא מקושר + שדות מקוננים אמיתיים שאומתו מול טיפוסי ה-SDK המותקן — `current_period_end` על ה-item לא על ה-subscription, `invoice.parent.subscription_details.subscription` לא `invoice.subscription`), `/api/stripe/{checkout,portal,webhook}` + `stripe_events` ledger אידמפוטנטי. עמוד `/account/billing` מחובר לכפתורי Checkout/Portal אמיתיים. **נבדק חי**: 401 ללא session, 400 על חתימת webhook חסרה/שגויה — ללא מפתחות Stripe אמיתיים (עדיין placeholder), כך שזרימת checkout מלאה לא נבדקה קצה-לקצה (דורש `docs/setup.md` שלב 2).

- **Batch 5**: Admin CRUD גנרי — `lib/admin/resources.ts` (רישום משאבים: matches/leagues/teams/predictions/models/backtests/data-sources/users/subscriptions/logs/data-health, כל אחד עם עמודות עריכה ו-Zod schema משלו) + `app/api/admin/[resource]/route.ts` (GET/POST/PATCH/DELETE גנרי, `requireAdmin()` עצמאי) + `components/admin/resource-table.tsx` (טבלה אינטראקטיבית גנרית אחת, לא 11 מסכים נפרדים). `/admin/backtests` כולל טריגר walk-forward אמיתי (`lib/jobs/runBacktest.ts` — מוגבל היום לכדורגל, ומתעד בפירוש שאין עדיין FDR אמיתי כי זו הרצה בודדת לא batch). `/admin` הראשי מציג ספירות אמיתיות + כשלי jobs אחרונים. **אומת חי**: משתמש בדיקה זמני נוצר דרך Supabase Admin API, קודם ל-role='admin', נבדקו השאילתות המדויקות של `requireAdmin()`/`isPro()` מול הנתונים האמיתיים (כולל אימות ה-trigger `handle_new_user` ומחיקת cascade), ואז נמחק לגמרי — לא נשאר עקבות. `pro_page_view` analytics מחובר לכל עמוד Pro.

- **Batch 6 (הושלם)**: `lib/rateLimit.ts` — token bucket in-process (per-instance, `globalThis`-scoped כמו `lib/providers/cache.ts`; Upstash Redis הוא שדרוג מתועד לעתיד ל-rate limiting מבוזר אמיתי), מחובר ל-`/api/scanner` (30/דקה למשתמש), `/api/stripe/checkout` (5/דקה), `/api/saved-matches` (60/דקה), `/api/admin/backtests/trigger` (5/דקה — כבד חישובית). Audit Zod מלא על כל 15 ה-API routes: תוקנו שני פערים אמיתיים — `id` ב-`/api/admin/[resource]` לא אומת כ-UUID לפני שאילתה (עכשיו כן), ו-`next` redirect ב-`/api/auth/callback` לא הגביל ל-path יחסי (עכשיו חוסם `//evil.com` ו-URL מוחלט לדומיין אחר — נבדק ב-unit test). **אומת חי**: ניסיון import מכוון של `lib/supabase/admin.ts` מתוך Client Component גרם ל-**כשל build אמיתי** (`'server-only' cannot be imported from a Client Component module`) — לא רק תגובה תיאורטית בהערה, אלא הגנת build-time אכיפה בפועל. נסרק `.next/static` ואומת שאין דליפת ערכי/שמות סודות ללקוח. 183 unit tests עוברים, build+lint נקיים.

עדיין TODO: QA ידני מלא כ-Free/Pro/Admin עם session דפדפן אמיתי (המשתמש צריך לבצע — ראה docs/setup.md סעיף 6; האימות האוטומטי בסשן זה כיסה שאילתות הרשאה ישירות מול ה-DB במקום זאת, כולל יצירה/קידום/מחיקה מלאה של משתמש בדיקה זמני), חשבונות Stripe/Odds API/Vercel אמיתיים (עדיין placeholders).

## הרחבה לענף ספורט נוסף
1. הוסף שורה ל-`sports` (מיגרציה חדשה) ול-league pool ב-`supabase/seed.sql`.
2. מימוש מודל ספציפי תחת `lib/prediction-engine/<sport>/` (למשל טניס — שרשראות מרקוב לפי המתודולוגיה סעיף 3.3).
3. `lib/prediction-engine/ensemble/combiner.ts` כבר תומך בכל מודל שמחזיר `{source, prob}` — אין צורך לגעת בו.
4. אין לגעת ב-`devig/`, `calibration/`, `uncertainty/`, `scoring/` — אלה sport-agnostic.
