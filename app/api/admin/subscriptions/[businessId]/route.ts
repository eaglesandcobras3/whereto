import { NextRequest, NextResponse } from "next/server";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { compLocalPartner, downgradeToClaimedListing, removeComp } from "@/lib/portal/billing";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { businessId } = await context.params;
  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  const supabase = getServiceSupabase();

  const { data: biz } = await supabase.from("businesses").select("id").eq("id", businessId).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  try {
    if (action === "comp") {
      await compLocalPartner(supabase, businessId, admin.userId);
      return NextResponse.json({ ok: true, status: "comped" });
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
