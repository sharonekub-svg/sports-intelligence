import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  cached = new Stripe(secretKey);
  return cached;
}
