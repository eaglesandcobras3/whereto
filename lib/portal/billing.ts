import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { PlanSlug } from "@/lib/portal/entitlements";
import { getStripe, localPartnerPriceId, siteBaseUrl } from "@/lib/stripe/server";

export type SubscriptionStatus = "active" | "comped" | "canceled" | "past_due";

export type BusinessSubscriptionRow = {
  business_id: string;
  plan_slug: PlanSlug;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  comped_by: string | null;
};

export function effectivePlanSlug(sub: Pick<BusinessSubscriptionRow, "plan_slug" | "status"> | null): PlanSlug {
  if (!sub) return "claimed_listing";
  if (
    (sub.status === "active" || sub.status === "comped" || sub.status === "past_due") &&
    sub.plan_slug === "local_partner"
  ) {
    return "local_partner";
  }
  return "claimed_listing";
}

export async function getBusinessSubscription(
  supabase: SupabaseClient,
  businessId: string,
): Promise<BusinessSubscriptionRow | null> {
  const { data } = await supabase
    .from("business_subscriptions")
    .select(
      "business_id, plan_slug, status, stripe_customer_id, stripe_subscription_id, current_period_end, comped_by",
    )
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as BusinessSubscriptionRow | null) ?? null;
}

export async function upsertLocalPartnerFromStripe(
  supabase: SupabaseClient,
  opts: {
    businessId: string;
    customerId: string;
    subscriptionId: string;
    currentPeriodEnd: Date | null;
    status?: SubscriptionStatus;
  },
): Promise<void> {
  const { error } = await supabase.from("business_subscriptions").upsert(
    {
      business_id: opts.businessId,
      plan_slug: "local_partner",
      status: opts.status ?? "active",
      stripe_customer_id: opts.customerId,
      stripe_subscription_id: opts.subscriptionId,
      current_period_end: opts.currentPeriodEnd?.toISOString() ?? null,
      comped_by: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(error.message);
}

export async function downgradeToClaimedListing(
  supabase: SupabaseClient,
  businessId: string,
): Promise<void> {
  const { error } = await supabase.from("business_subscriptions").upsert(
    {
      business_id: businessId,
      plan_slug: "claimed_listing",
      status: "active",
      stripe_subscription_id: null,
      current_period_end: null,
      comped_by: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(error.message);
}

export async function compLocalPartner(
  supabase: SupabaseClient,
  businessId: string,
  adminUserId: string,
): Promise<void> {
  const { error } = await supabase.from("business_subscriptions").upsert(
    {
      business_id: businessId,
      plan_slug: "local_partner",
      status: "comped",
      comped_by: adminUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeComp(
  supabase: SupabaseClient,
  businessId: string,
): Promise<void> {
  const existing = await getBusinessSubscription(supabase, businessId);
  if (existing?.stripe_subscription_id) {
    const { error } = await supabase
      .from("business_subscriptions")
      .update({
        status: "active",
        comped_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    return;
  }
  await downgradeToClaimedListing(supabase, businessId);
}

function stripeSubscriptionStatusToPortal(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

export async function syncStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const businessId =
    subscription.metadata.business_id?.trim() ||
    (typeof subscription.items.data[0]?.price?.metadata?.business_id === "string"
      ? subscription.items.data[0].price.metadata.business_id
      : null);

  if (!businessId) return null;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const portalStatus = stripeSubscriptionStatusToPortal(subscription.status);
  const item = subscription.items.data[0];
  const periodEndUnix = item?.current_period_end ?? null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  if (portalStatus === "canceled") {
    await downgradeToClaimedListing(supabase, businessId);
    return businessId;
  }

  await upsertLocalPartnerFromStripe(supabase, {
    businessId,
    customerId,
    subscriptionId: subscription.id,
    currentPeriodEnd: periodEnd,
    status: portalStatus,
  });

  return businessId;
}

export async function createLocalPartnerCheckout(opts: {
  supabase: SupabaseClient;
  businessId: string;
  businessTitle: string;
  userId: string;
  userEmail: string;
}): Promise<string> {
  const stripe = getStripe();
  const base = siteBaseUrl();

  const existing = await getBusinessSubscription(opts.supabase, opts.businessId);
  if (effectivePlanSlug(existing) === "local_partner") {
    throw new Error("This business already has Local Partner.");
  }

  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: opts.userEmail,
      metadata: { business_id: opts.businessId, user_id: opts.userId },
    });
    customerId = customer.id;
    await opts.supabase
      .from("business_subscriptions")
      .upsert(
        {
          business_id: opts.businessId,
          plan_slug: "claimed_listing",
          status: "active",
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "business_id" },
      );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: localPartnerPriceId(), quantity: 1 }],
    success_url: `${base}/portal/billing?success=1&business_id=${encodeURIComponent(opts.businessId)}`,
    cancel_url: `${base}/portal/billing?canceled=1&business_id=${encodeURIComponent(opts.businessId)}`,
    client_reference_id: opts.businessId,
    metadata: {
      business_id: opts.businessId,
      user_id: opts.userId,
    },
    subscription_data: {
      metadata: {
        business_id: opts.businessId,
        user_id: opts.userId,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Could not start checkout.");
  return session.url;
}

export async function recordStripeEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<boolean> {
  const { error } = await supabase.from("portal_stripe_events").insert({ event_id: eventId });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}
