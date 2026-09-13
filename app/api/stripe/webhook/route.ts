import { NextResponse, type NextRequest } from "next/server";
import { getStripeClient } from "@/lib/stripe/client";
import { handleStripeEvent, type WebhookDbClient } from "@/lib/stripe/webhookHandlers";
import { getAdminClient } from "@/lib/supabase/admin";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

// Raw-body route: reads the exact bytes Stripe signed, so it must never
// pass through any body-parsing middleware. proxy.ts explicitly excludes
// this path from its matcher for the same reason (see proxy.ts).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "missing signature or webhook secret" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: `invalid signature: ${error instanceof Error ? error.message : String(error)}` },
      { status: 400 }
    );
  }

  const admin = getAdminClient();

  // Idempotency: a duplicate delivery of an event we've already fully
  // processed is a no-op, not an error.
  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    // Structural cast: SupabaseClient satisfies WebhookDbClient at runtime
    // (same duck-typing pattern as lib/jobs/jobRunner.ts's JobRunnerClient)
    // but its PostgrestBuilder return types don't nominally match Promise,
    // which TypeScript can't verify structurally without this.
    await handleStripeEvent(admin as unknown as WebhookDbClient, event);
  } catch (error) {
    // Deliberately do NOT record this event as processed — Stripe will
    // retry, and the next attempt gets a clean shot at it.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "handler failed" },
      { status: 500 }
    );
  }

  // Recorded only AFTER successful handling (see lib/stripe/webhookHandlers.ts).
  await admin.from("stripe_events").insert({ stripe_event_id: event.id, type: event.type });

  if (event.type === "checkout.session.completed") {
    await serverTrack(ANALYTICS_EVENTS.PURCHASE, { eventId: event.id });
  }

  return NextResponse.json({ received: true });
}
