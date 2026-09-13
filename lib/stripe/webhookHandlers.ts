import "server-only";
import type Stripe from "stripe";

/**
 * Minimal structural client type — same testability pattern as
 * lib/jobs/jobRunner.ts's JobRunnerClient: lets tests inject an in-memory
 * fake instead of a real Supabase client.
 */
export interface WebhookDbClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): { maybeSingle(): Promise<{ data: unknown }> };
    };
    upsert(
      row: Record<string, unknown>,
      options: { onConflict: string }
    ): Promise<{ error: { message: string } | null }>;
    update(row: Record<string, unknown>): {
      eq(column: string, value: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
}

async function findUserIdForSubscription(
  client: WebhookDbClient,
  subscriptionId: string,
  customerId: string
): Promise<string | null> {
  const { data: bySubscription } = await client
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (bySubscription) return (bySubscription as { user_id: string }).user_id;

  const { data: byCustomer } = await client
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (byCustomer as { user_id: string } | null)?.user_id ?? null;
}

async function upsertFromSubscription(
  client: WebhookDbClient,
  subscription: Stripe.Subscription
): Promise<{ linked: boolean }> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = await findUserIdForSubscription(client, subscription.id, customerId);
  if (!userId) {
    // No linkage yet — checkout.session.completed (which carries
    // client_reference_id) is expected to arrive and create it. Not an
    // error: Stripe doesn't guarantee event delivery order.
    return { linked: false };
  }

  // current_period_end lives on the subscription ITEM in this API
  // version, not on the subscription object itself (verified against the
  // installed stripe@22.6.2 type definitions).
  const item = subscription.items.data[0];
  const currentPeriodEnd = item ? new Date(item.current_period_end * 1000).toISOString() : null;

  await client.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: item?.price.id ?? null,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: "stripe_subscription_id" }
  );
  return { linked: true };
}

async function handleCheckoutCompleted(client: WebhookDbClient, session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!userId || !customerId || !subscriptionId) {
    throw new Error(
      `checkout.session.completed missing required fields (userId=${userId}, customerId=${customerId}, subscriptionId=${subscriptionId})`
    );
  }

  // Optimistic initial link — customer.subscription.created/updated (which
  // typically arrives around the same time) fills in the authoritative
  // status/price/period fields via upsertFromSubscription above.
  await client.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: "active",
    },
    { onConflict: "stripe_subscription_id" }
  );
}

async function handleSubscriptionDeleted(client: WebhookDbClient, subscription: Stripe.Subscription) {
  await client.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", subscription.id);
}

/**
 * Routes one verified Stripe event to its handler. Never throws for an
 * unhandled event type (Stripe sends many we don't care about) — only
 * throws for a malformed payload of a type we DO handle, so the route
 * handler's idempotency ledger insert (see app/api/stripe/webhook/route.ts)
 * correctly skips on failure and lets Stripe retry.
 */
export async function handleStripeEvent(client: WebhookDbClient, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(client, event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertFromSubscription(client, event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(client, event.data.object);
      break;
    case "invoice.payment_failed": {
      // invoice.subscription was removed from the top-level Invoice object
      // in this API version — verified against the installed stripe@22.6.2
      // types, it now lives at invoice.parent.subscription_details.subscription.
      const invoice = event.data.object;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (subscriptionId) {
        await client.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subscriptionId);
      }
      break;
    }
    case "invoice.payment_succeeded":
      // current_period_end refresh happens via the accompanying
      // customer.subscription.updated event Stripe sends alongside this
      // one — nothing additional to do here.
      break;
    default:
      break;
  }
}
