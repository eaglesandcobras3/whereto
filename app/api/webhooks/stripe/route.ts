import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { recordBillingEvent } from "@/lib/portal/billing-events";
import { sendPortalOwnerEmail } from "@/lib/portal/notifications";
import {
  effectivePlanSlug,
  getBusinessSubscription,
  recordStripeEvent,
  syncStripeSubscription,
} from "@/lib/portal/billing";
import { isPaidPlan } from "@/lib/portal/entitlements";
import { getStripe } from "@/lib/stripe/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

async function ownerEmailForBusiness(businessId: string): Promise<{ email: string; title: string } | null> {
  const supabase = getServiceSupabase();
  const { data: biz } = await supabase
    .from("businesses")
    .select("title, claimed_by_user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz?.claimed_by_user_id) return null;

  const { data: user } = await supabase.auth.admin.getUserById(biz.claimed_by_user_id as string);
  if (!user.user?.email) return null;

  return { email: user.user.email, title: String(biz.title ?? "your business") };
}

async function businessIdFromSubscriptionId(subscriptionId: string): Promise<string | null> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return (
    subscription.metadata.business_id?.trim() ||
    (typeof subscription.items.data[0]?.price?.metadata?.business_id === "string"
      ? subscription.items.data[0].price.metadata.business_id
      : null)
  );
}

async function notifyPaymentSuccess(businessId: string): Promise<void> {
  const owner = await ownerEmailForBusiness(businessId);
  if (!owner) return;
  await sendPortalOwnerEmail({
    to: owner.email,
    event: "payment_success",
    businessTitle: owner.title,
  });
}

async function notifyPaymentFailed(businessId: string): Promise<void> {
  const owner = await ownerEmailForBusiness(businessId);
  if (!owner) return;
  await sendPortalOwnerEmail({
    to: owner.email,
    event: "payment_failed",
    businessTitle: owner.title,
  });
}

async function notifySubscriptionUpgraded(businessId: string): Promise<void> {
  const owner = await ownerEmailForBusiness(businessId);
  if (!owner) return;
  await sendPortalOwnerEmail({
    to: owner.email,
    event: "subscription_upgraded",
    businessTitle: owner.title,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const businessId = session.metadata?.business_id?.trim() || session.client_reference_id?.trim();
  if (!businessId) return;

  const supabase = getServiceSupabase();
  const subBefore = await getBusinessSubscription(supabase, businessId);
  const wasFree = effectivePlanSlug(subBefore) === "claimed_listing";

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!subscriptionId || !customerId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncStripeSubscription(supabase, subscription);

  const subAfter = await getBusinessSubscription(supabase, businessId);
  if (wasFree && isPaidPlan(effectivePlanSlug(subAfter))) {
    await notifySubscriptionUpgraded(businessId);
  } else {
    await notifyPaymentSuccess(businessId);
  }
}

async function handleInvoice(
  invoice: Stripe.Invoice,
  stripeEventId: string,
  eventType: "payment_succeeded" | "payment_failed",
): Promise<void> {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof parentSub === "string" ? parentSub : parentSub?.id;
  if (!subscriptionId) return;

  const businessId = await businessIdFromSubscriptionId(subscriptionId);
  if (!businessId) return;

  const supabase = getServiceSupabase();
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncStripeSubscription(supabase, subscription);

  await recordBillingEvent(supabase, {
    businessId,
    stripeEventId,
    stripeInvoiceId: invoice.id ?? null,
    eventType,
    amountCents: invoice.amount_paid ?? invoice.amount_due ?? null,
    currency: invoice.currency ?? "usd",
    description: invoice.description ?? `Invoice ${invoice.number ?? invoice.id ?? ""}`.trim(),
  });

  if (eventType === "payment_succeeded") {
    await notifyPaymentSuccess(businessId);
  } else {
    await notifyPaymentFailed(businessId);
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const isNew = await recordStripeEvent(supabase, event.id);
  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleCheckoutCompleted(session);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncStripeSubscription(supabase, subscription);
        if (event.type === "customer.subscription.deleted") {
          const businessId =
            subscription.metadata.business_id?.trim() ||
            (typeof subscription.items.data[0]?.price?.metadata?.business_id === "string"
              ? subscription.items.data[0].price.metadata.business_id
              : null);
          if (businessId) {
            await recordBillingEvent(supabase, {
              businessId,
              stripeEventId: event.id,
              eventType: "subscription_canceled",
              description: "Subscription canceled",
            });
          }
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoice(invoice, event.id, "payment_succeeded");
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoice(invoice, event.id, "payment_failed");
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook]", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
