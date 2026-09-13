import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CheckoutButton from "./checkout-button";
import PortalButton from "./portal-button";

interface SubscriptionRow {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const PRO_FEATURES = [
  "כל 20 ההזדמנויות המובילות בלוח המשחקים (במקום 5)",
  "Model vs Market מלא לכל משחק — Confidence ו-Data Quality",
  "עדיפות בעדכוני המודל",
];

export default async function BillingPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");

  const pro = await isPro(user.id);
  const admin = getAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle<SubscriptionRow>();

  return (
    <div className="mx-auto max-w-lg">
      {pro ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">חיוב ומנוי</h1>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">סטטוס נוכחי</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">תוכנית</span>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  Pro
                </Badge>
              </div>
              {subscription && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">סטטוס Stripe</span>
                    <span className="font-data">{subscription.status}</span>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {subscription.cancel_at_period_end ? "מסתיים בתאריך" : "מתחדש בתאריך"}
                      </span>
                      <span className="font-data">
                        {new Date(subscription.current_period_end).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="mt-2">
                <PortalButton />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight">פתח את שכבת המידע המלאה</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            תוכנית אחת, ללא הגבלות מבלבלות — כל שכבות האנליטיקה במקום אחד.
          </p>
          <Card className="mt-6">
            <CardContent className="pt-6">
              <ul className="flex flex-col gap-3">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-positive" strokeWidth={2} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CheckoutButton />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
