import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// apiVersion intentionally omitted — the installed SDK pins its own default API
// version, which is more reliable than hardcoding a date string here that will
// silently go stale.
export const stripe = new Stripe(secretKey);
