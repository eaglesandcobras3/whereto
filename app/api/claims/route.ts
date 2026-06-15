import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { business_id?: string; note?: string };
  const businessId = String(body.business_id ?? "").trim();
  const note = String(body.note ?? "").trim().slice(0, 500);
  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, claim_status")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }
  if ((biz.claim_status as string) === "claimed") {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from("business_claim_requests")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You already have a pending request" }, { status: 409 });
  }

  const { error: insErr } = await supabase.from("business_claim_requests").insert({
    business_id: businessId,
    user_id: user.id,
    status: "pending",
    claimant_note: note || null,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const svc = getServiceSupabase();
  await svc
    .from("businesses")
    .update({ claim_status: "pending_review" })
    .eq("id", businessId)
    .in("claim_status", ["unclaimed", "pending_review"]);

  return NextResponse.json({ ok: true });
}
