# Sports Intelligence

פלטפורמת אנליטיקת ספורט ישראלית — משווה הסתברות מודל סטטיסטי (Elo, Poisson/Dixon-Coles, רגרסיה לוגיסטית, ensemble) מול הסתברות שוק (אחרי הסרת מרווח הבית), ומדרגת פערים ("הזדמנויות") לפי איכות — לא רק גודל.

**זו פלטפורמת אנליטיקה בלבד.** אין באתר הפקדות, משיכות, ביצוע הימורים, או הבטחת רווח. ראו `docs/methodology.md` להסבר המתודולוגי המלא, ו-`app/(public)/disclaimer` להבהרה המשפטית.

## מצב הפרויקט

בבנייה. ראה `docs/architecture.md` למה שכבר קיים ומה עדיין TODO. הריפו הזה נפרד לגמרי מפרויקט `hapogea` (Winner odds site) — אין ביניהם שיתוף קוד או נתונים.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind v4 + shadcn/ui (RTL) · Supabase (Postgres + Auth + RLS) · Stripe · Zod · Vitest · pnpm.

## פיתוח מקומי

```bash
pnpm install
cp .env.example .env.local   # מלא ערכים אמיתיים — ראו docs/setup.md
pnpm dev
```

- `pnpm build` — בניית production, כולל type-check.
- `pnpm lint` — ESLint.
- `pnpm test` — Vitest (יחידה, ליד כל מודול תחת `lib/prediction-engine/`).
- `pnpm run supabase:push` — הפעלת ה-migrations על פרויקט Supabase מקושר (לא דורש Docker).

## הקמה מלאה (Supabase / Stripe / Vercel / Odds API)

כל השלבים שדורשים חשבון אמיתי שלך מפורטים ב-**[`docs/setup.md`](docs/setup.md)** — שום דבר שם לא בוצע מראש.

## מסמכים

- [`docs/methodology.md`](docs/methodology.md) — המתודולוגיה הסטטיסטית המלאה (Model vs Market, de-vig, כיול, Backtesting, Opportunity Score).
- [`docs/architecture.md`](docs/architecture.md) — מבנה הקוד, עקרונות אבטחה, איך מוסיפים ענף ספורט חדש.
- [`docs/setup.md`](docs/setup.md) — הקמת חשבונות חיצוניים.
