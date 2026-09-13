import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { getStripeClient } from "@/lib/stripe/client";
import { getAdminClient } from "@/lib/supabase/admin";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST() {
  const user = await getVerifiedUser();
  if (!user) return NextResponse.json({ error: "התחברות נדרשת" }, { status: 401 });

  const rateLimit = checkRateLimit(`checkout:${user.id}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "יותר מדי בקשות, נסה שוב בעוד רגע" }, { status: 429 });
  }

  const priceId = process.env.STRIPE_PRICE_ID_PRO;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!priceId) {
    return NextResponse.json({ error: "המנוי אינו מוגדר עדיין" }, { status: 500 });
  }

  const stripe = getStripeClient();
  const admin = getAdminClient();

  // Reuse an existing Stripe customer for this user if we've already
  // linked one (e.g. from a past subscription), otherwise let Checkout
  // create one — client_reference_id is what links the resulting
  // subscription back to this user in the webhook handler.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: user.id,
    customer: (existing as { stripe_customer_id: string } | null)?.stripe_customer_id,
    customer_email: existing ? undefined : (user.email ?? undefined),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account/billing?checkout=success`,
    cancel_url: `${appUrl}/account/billing?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "יצירת ה-Checkout נכשלה" }, { status: 500 });
  }

  await serverTrack(ANALYTICS_EVENTS.CHECKOUT_START, { userId: user.id });
  return NextResponse.json({ url: session.url });
}
