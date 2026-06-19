import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendPortalOwnerEmail } from "@/lib/portal/notifications";
import {
  recordStripeEvent,
  syncStripeSubscription,
} from "@/lib/portal/billing";
import { getStripe } from "@/lib/stripe/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

async function notifyPaymentSuccess(businessId: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { data: biz } = await supabase.from("businesses").select("title, claimed_by_user_id").eq("id", businessId).maybeSingle();
  if (!biz?.claimed_by_user_id) return;

  const { data: user } = await supabase.auth.admin.getUserById(biz.claimed_by_user_id as string);
  if (!user.user?.email) return;

  await sendPortalOwnerEmail({
    to: user.user.email,
    event: "payment_success",
    businessTitle: String(biz.title ?? "your business"),
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const businessId = session.metadata?.business_id?.trim() || session.client_reference_id?.trim();
  if (!businessId) return;

  const supabase = getServiceSupabase();
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!subscriptionId || !customerId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncStripeSubscription(supabase, subscription);
  await notifyPaymentSuccess(businessId);
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
        const businessId = await syncStripeSubscription(supabase, subscription);
        if (event.type === "customer.subscription.deleted" && businessId) {
          // downgrade handled in sync
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof parentSub === "string" ? parentSub : parentSub?.id;
        if (subscriptionId) {
          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncStripeSubscription(supabase, subscription);
        }
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
