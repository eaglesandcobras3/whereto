import { NextRequest, NextResponse } from "next/server";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { listBillingEvents } from "@/lib/portal/billing-events";
import { requireBusinessOwner } from "@/lib/portal/require-business-owner";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const businessId = request.nextUrl.searchParams.get("business_id")?.trim();
  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  const owner = await requireBusinessOwner(businessId);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const events = await listBillingEvents(supabase, businessId);

  return NextResponse.json({ events });
}
