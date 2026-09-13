import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { handleStripeEvent, type WebhookDbClient } from "@/lib/stripe/webhookHandlers";

/**
 * In-memory fake DB — same testability pattern as lib/jobs/jobRunner.ts's
 * JobRunnerClient: a single in-memory `subscriptions` table supporting
 * exactly the operations webhookHandlers.ts uses.
 */
function createFakeDb() {
  const subscriptions: Record<string, unknown>[] = [];

  const client: WebhookDbClient = {
    from(table: string) {
      if (table !== "subscriptions") throw new Error(`unexpected table "${table}"`);
      return {
        select(_columns: string) {
          return {
            eq(column: string, value: unknown) {
              return {
                async maybeSingle() {
                  const row = subscriptions.find((r) => r[column] === value);
                  return { data: row ?? null };
                },
              };
            },
          };
        },
        async upsert(row: Record<string, unknown>, options: { onConflict: string }) {
          const key = options.onConflict;
          const idx = subscriptions.findIndex((r) => r[key] === row[key]);
          if (idx >= 0) subscriptions[idx] = { ...subscriptions[idx], ...row };
          else subscriptions.push({ ...row });
          return { error: null };
        },
        update(row: Record<string, unknown>) {
          return {
            async eq(column: string, value: unknown) {
              const idx = subscriptions.findIndex((r) => r[column] === value);
              if (idx >= 0) subscriptions[idx] = { ...subscriptions[idx], ...row };
              return { error: null };
            },
          };
        },
      };
    },
  };

  return { client, subscriptions };
}

function makeEvent<T>(type: string, object: T): Stripe.Event {
  return { id: `evt_${type}_${Math.random()}`, type, data: { object } } as unknown as Stripe.Event;
}

describe("handleStripeEvent", () => {
  it("checkout.session.completed creates an optimistic 'active' link", async () => {
    const { client, subscriptions } = createFakeDb();
    const event = makeEvent("checkout.session.completed", {
      client_reference_id: "user-1",
      customer: "cus_1",
      subscription: "sub_1",
    });

    await handleStripeEvent(client, event);

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toMatchObject({
      user_id: "user-1",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      status: "active",
    });
  });

  it("throws on a malformed checkout.session.completed (missing required fields)", async () => {
    const { client } = createFakeDb();
    const event = makeEvent("checkout.session.completed", { client_reference_id: null, customer: null });
    await expect(handleStripeEvent(client, event)).rejects.toThrow();
  });

  it("customer.subscription.updated refreshes status/price/period on an already-linked row", async () => {
    const { client, subscriptions } = createFakeDb();
    subscriptions.push({ user_id: "user-1", stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1", status: "active" });

    const event = makeEvent("customer.subscription.updated", {
      id: "sub_1",
      customer: "cus_1",
      status: "past_due",
      cancel_at_period_end: true,
      items: { data: [{ current_period_end: 1_800_000_000, price: { id: "price_pro" } }] },
    });

    await handleStripeEvent(client, event);

    expect(subscriptions[0]).toMatchObject({
      status: "past_due",
      price_id: "price_pro",
      cancel_at_period_end: true,
      current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
    });
  });

  it("customer.subscription.updated is a documented no-op when no linking row exists yet", async () => {
    const { client, subscriptions } = createFakeDb();
    const event = makeEvent("customer.subscription.updated", {
      id: "sub_unlinked",
      customer: "cus_unlinked",
      status: "active",
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: 1_800_000_000, price: { id: "price_pro" } }] },
    });

    await handleStripeEvent(client, event);
    expect(subscriptions).toHaveLength(0);
  });

  it("customer.subscription.deleted marks the row canceled", async () => {
    const { client, subscriptions } = createFakeDb();
    subscriptions.push({ user_id: "user-1", stripe_subscription_id: "sub_1", status: "active" });

    const event = makeEvent("customer.subscription.deleted", { id: "sub_1" });
    await handleStripeEvent(client, event);

    expect(subscriptions[0].status).toBe("canceled");
  });

  it("invoice.payment_failed marks the linked subscription past_due (via the nested parent.subscription_details path)", async () => {
    const { client, subscriptions } = createFakeDb();
    subscriptions.push({ user_id: "user-1", stripe_subscription_id: "sub_1", status: "active" });

    const event = makeEvent("invoice.payment_failed", {
      parent: { subscription_details: { subscription: "sub_1" } },
    });
    await handleStripeEvent(client, event);

    expect(subscriptions[0].status).toBe("past_due");
  });

  it("ignores an unhandled event type without throwing", async () => {
    const { client } = createFakeDb();
    const event = makeEvent("payment_intent.succeeded", {});
    await expect(handleStripeEvent(client, event)).resolves.toBeUndefined();
  });
});
