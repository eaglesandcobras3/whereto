import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { createBillingPortalSession } from "@/lib/portal/billing";
import { requireBusinessOwner } from "@/lib/portal/require-business-owner";
import { stripeConfigured } from "@/lib/stripe/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  business_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "business_id is required." }, { status: 400 });
  }

  const owner = await requireBusinessOwner(parsed.data.business_id);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();

  try {
    const url = await createBillingPortalSession({
      supabase,
      businessId: parsed.data.business_id,
      userId: owner.userId,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not open billing portal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
