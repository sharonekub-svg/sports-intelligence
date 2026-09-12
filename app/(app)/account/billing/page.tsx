import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Stripe Checkout/Portal wiring lands in a later build phase (Pro gating +
// Stripe). This stub exists now so /account's link doesn't dead-end.
export default async function BillingPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">חיוב ומנוי</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">בקרוב</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ניהול מנוי Stripe (שדרוג, ביטול, פרטי חיוב) ייפתח בשלב הבא של
          הפיתוח.
        </CardContent>
      </Card>
    </div>
  );
}
