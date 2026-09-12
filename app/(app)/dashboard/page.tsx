import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Full dashboard (Top Opportunities, upcoming matches, blind spots preview,
// model performance summary) is built in a later phase, once the data
// providers and prediction engine exist. This placeholder is clearly
// labeled demo content so it can never be mistaken for a live result.
export default async function DashboardPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold">לוח בקרה</h1>
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">נתוני הדגמה</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          הדשבורד המלא (הזדמנויות מובילות, משחקים קרובים, ביצועי מודל) יופיע
          כאן לאחר חיבור מקורות הנתונים ומנוע הניבוי. שלב זה עדיין לא כולל
          תחזיות אמיתיות.
        </CardContent>
      </Card>
    </div>
  );
}
