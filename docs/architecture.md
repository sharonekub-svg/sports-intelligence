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

## מצב נוכחי (אחרי Batch 2)
בוצע:
- **Batch 1**: Architecture, Design System (Tailwind/shadcn RTL), Database (schema+RLS+triggers), Auth (login/signup/forgot-password/reset-password/account, session gating דרך proxy.ts). מיושם ונבדק חי מול פרויקט Supabase אמיתי.
- **Batch 2**: Data Providers (`lib/providers/`: The Odds API + free scores provider מבוסס 365scores, עם retry+cache+fallback chain — נבדק מול תגובה חיה אמיתית), Prediction Engine מלא (`lib/prediction-engine/`: de-vig Shin/power/proportional, Poisson/Dixon-Coles, Elo, כיווץ בייסיאני, אנסמבל, כיול Brier/LogLoss/ECE/Platt/Beta, Wilson CI, Opportunity/Confidence Score, backtest harness עם purge/embargo ו-FDR) — **139 unit tests עוברים**, `lib/prediction-engine/index.ts` הוא ה-facade היחיד שקורא ל-DB (דרך repos מוזרקים, טרם מחובר). עמוד `/match/[id]` בנוי מול הסכימה האמיתית (Free/Pro gating עובד, `predictions_public` vs `predictions` מלא). `pnpm verify:engine` מריץ את המנוע המלא קצה-לקצה (fixture או Odds API חי) ומדפיס תוצאות הגיוניות.

עדיין TODO (Batches הבאים): חיבור מנוע הניבוי ל-cron jobs אמיתיים (`lib/jobs/*`, Batch 3), Scanner, Hidden Opportunities, Market Blind Spots, Model Performance, Stripe, Admin CRUD מלא, Analytics מחובר לספק חיצוני.

## הרחבה לענף ספורט נוסף
1. הוסף שורה ל-`sports` (מיגרציה חדשה) ול-league pool ב-`supabase/seed.sql`.
2. מימוש מודל ספציפי תחת `lib/prediction-engine/<sport>/` (למשל טניס — שרשראות מרקוב לפי המתודולוגיה סעיף 3.3).
3. `lib/prediction-engine/ensemble/combiner.ts` כבר תומך בכל מודל שמחזיר `{source, prob}` — אין צורך לגעת בו.
4. אין לגעת ב-`devig/`, `calibration/`, `uncertainty/`, `scoring/` — אלה sport-agnostic.
