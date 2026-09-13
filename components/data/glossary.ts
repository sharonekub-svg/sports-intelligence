/**
 * Short, plain-language explanations for terms the product surfaces
 * everywhere but that mean nothing to a non-statistician — used by
 * <TermTooltip>. Keep these to one sentence; the full methodology lives
 * in docs/methodology.md, not in a tooltip.
 */
export const GLOSSARY = {
  overround: "המרווח שהבית מוסיף כדי להבטיח רווח — כל ההסתברויות הגולמיות ביחד תמיד גבוהות מ-100%.",
  calibration: "עד כמה תחזיות המודל תואמות את מה שקורה בפועל — אם 100 תחזיות ב-70% מתממשות ב-70% מהמקרים, זה כיול טוב.",
  brierScore: "ציון שמודד עד כמה ההסתברויות שהמודל נתן היו קרובות לתוצאה בפועל — נמוך יותר טוב יותר.",
  logLoss: "מדד דומה ל-Brier Score, אך מעניש בחומרה רבה יותר תחזית בטוחה שהתבררה כשגויה.",
  opportunityScore: "גודל הפער בין המודל לשוק, מנורמל לפי רמת אי-הוודאות — לא רק גודל הפער עצמו.",
  marketProbability: "ההסתברות הנגזרת מיחסי ההימור בשוק, לאחר הסרת מרווח הבית (de-vig).",
  confidence: "רמת האמון של המערכת בהסתברות שהמודל נתן, בהתבסס על כיול המודל ורוחב אי-הוודאות.",
  dataQuality: "מדד שמשקף שלמות הנתונים, עומק היסטורי, ועדכניות המידע ששימש לחישוב התחזית.",
  gap: "ההפרש בנקודות אחוז בין הסתברות המודל להסתברות השוק.",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
