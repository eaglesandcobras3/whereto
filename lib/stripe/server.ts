import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_LOCAL_PARTNER_PRICE_ID?.trim(),
  );
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

export function localPartnerPriceId(): string {
  const id = process.env.STRIPE_LOCAL_PARTNER_PRICE_ID?.trim();
  if (!id) throw new Error("Missing STRIPE_LOCAL_PARTNER_PRICE_ID");
  return id;
}

export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
