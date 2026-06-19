import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import {
  createLocalPartnerCheckout,
  effectivePlanSlug,
  getBusinessSubscription,
} from "@/lib/portal/billing";
import { getBusinessPlan } from "@/lib/portal/entitlements";
import { requireBusinessOwner } from "@/lib/portal/require-business-owner";
import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { stripeConfigured } from "@/lib/stripe/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const checkoutSchema = z.object({
  business_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const businessId = request.nextUrl.searchParams.get("business_id")?.trim();
  const supabase = getServiceSupabase();

  const { data: memberships } = await supabase
    .from("business_members")
    .select("role, business_id, businesses ( id, title, slug )")
    .eq("user_id", session.user.id)
    .eq("role", "owner");

  const owned = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const bizRaw = m.businesses;
      const biz = (Array.isArray(bizRaw) ? bizRaw[0] : bizRaw) as Record<string, unknown> | null;
      const id = String(biz?.id ?? m.business_id);
      const sub = await getBusinessSubscription(supabase, id);
      const { planSlug, entitlements } = await getBusinessPlan(supabase, id);
      return {
        id,
        title: String(biz?.title ?? "Business"),
        slug: String(biz?.slug ?? ""),
        plan: planSlug,
        entitlements,
        subscription: sub,
        effective_plan: effectivePlanSlug(sub),
      };
    }),
  );

  if (businessId) {
    const one = owned.find((b) => b.id === businessId);
    if (!one) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({
      business: one,
      stripe_configured: stripeConfigured(),
    });
  }

  return NextResponse.json({
    businesses: owned,
    stripe_configured: stripeConfigured(),
  });
}

export async function POST(request: NextRequest) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "business_id is required." }, { status: 400 });
  }

  const owner = await requireBusinessOwner(parsed.data.business_id);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, title")
    .eq("id", parsed.data.business_id)
    .maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const email = session.user.email;
  if (!email) {
    return NextResponse.json({ error: "Account email required for checkout." }, { status: 400 });
  }

  try {
    const url = await createLocalPartnerCheckout({
      supabase,
      businessId: parsed.data.business_id,
      businessTitle: String(biz.title),
      userId: session.user.id,
      userEmail: email,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
