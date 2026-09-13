import { redirect } from "next/navigation";
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
      <h1 className="text-2xl font-bold">חיוב ומנוי</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">סטטוס נוכחי</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">תוכנית</span>
            <Badge variant={pro ? "default" : "secondary"}>{pro ? "Pro" : "חינמי"}</Badge>
          </div>
          {subscription && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">סטטוס Stripe</span>
                <span>{subscription.status}</span>
              </div>
              {subscription.current_period_end && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {subscription.cancel_at_period_end ? "מסתיים בתאריך" : "מתחדש בתאריך"}
                  </span>
                  <span>{new Date(subscription.current_period_end).toLocaleDateString("he-IL")}</span>
                </div>
              )}
            </>
          )}

          <div className="mt-2">
            {pro ? <PortalButton /> : <CheckoutButton />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
