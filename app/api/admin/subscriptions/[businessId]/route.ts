import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { compPaidPlan, downgradeToClaimedListing, removeComp } from "@/lib/portal/billing";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const actionSchema = z.object({
  action: z.enum(["comp", "remove_comp", "downgrade"]),
  plan_slug: z.enum(["local_partner", "premium_partner", "signature_partner"]).optional(),
});

type RouteContext = { params: Promise<{ businessId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { businessId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { action, plan_slug: planSlug } = parsed.data;
  const supabase = getServiceSupabase();

  const { data: biz } = await supabase.from("businesses").select("id").eq("id", businessId).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  try {
    if (action === "comp") {
      await compPaidPlan(supabase, businessId, admin.userId, planSlug ?? "local_partner");
      return NextResponse.json({ ok: true, status: "comped", plan: planSlug ?? "local_partner" });
    }
    if (action === "remove_comp") {
      await removeComp(supabase, businessId);
      return NextResponse.json({ ok: true, status: "active" });
    }
    if (action === "downgrade") {
      await downgradeToClaimedListing(supabase, businessId);
      return NextResponse.json({ ok: true, status: "claimed_listing" });
    }
    return NextResponse.json({ error: "action must be comp, remove_comp, or downgrade" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
