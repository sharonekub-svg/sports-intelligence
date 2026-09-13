import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { getStripeClient } from "@/lib/stripe/client";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const user = await getVerifiedUser();
  if (!user) return NextResponse.json({ error: "התחברות נדרשת" }, { status: 401 });

  const admin = getAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = (data as { stripe_customer_id: string } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "לא נמצא מנוי פעיל" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/account/billing`,
  });

  return NextResponse.json({ url: session.url });
}
