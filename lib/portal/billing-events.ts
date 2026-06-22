import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingEventType = "payment_succeeded" | "payment_failed" | "subscription_canceled";

export type BillingEventRow = {
  id: string;
  business_id: string;
  stripe_event_id: string | null;
  stripe_invoice_id: string | null;
  event_type: BillingEventType;
  amount_cents: number | null;
  currency: string;
  description: string | null;
  created_at: string;
};

export async function recordBillingEvent(
  supabase: SupabaseClient,
  row: {
    businessId: string;
    stripeEventId?: string | null;
    stripeInvoiceId?: string | null;
    eventType: BillingEventType;
    amountCents?: number | null;
    currency?: string;
    description?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("business_billing_events").insert({
    business_id: row.businessId,
    stripe_event_id: row.stripeEventId ?? null,
    stripe_invoice_id: row.stripeInvoiceId ?? null,
    event_type: row.eventType,
    amount_cents: row.amountCents ?? null,
    currency: row.currency ?? "usd",
    description: row.description ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listBillingEvents(
  supabase: SupabaseClient,
  businessId: string,
  limit = 20,
): Promise<BillingEventRow[]> {
  const { data, error } = await supabase
    .from("business_billing_events")
    .select(
      "id, business_id, stripe_event_id, stripe_invoice_id, event_type, amount_cents, currency, description, created_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as BillingEventRow[]) ?? [];
}
