import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">סקירה כללית</h1>
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">בבנייה</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          כלי הניהול המלאים (משחקים, ליגות, מודלים, Backtests, בריאות
          נתונים) ייבנו בשלב מאוחר יותר, לאחר שמנוע הניבוי וה-ingestion
          יהיו מחוברים.
        </CardContent>
      </Card>
    </div>
  );
}
