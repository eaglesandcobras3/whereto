import { NextRequest, NextResponse } from "next/server";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { sendPortalOwnerEmail } from "@/lib/portal/notifications";
import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await context.params;
  const id = businessId.trim();
  if (!id) return NextResponse.json({ error: "business_id required" }, { status: 400 });

  let body: { role?: string; phone?: string; note?: string };
  try {
    body = (await request.json()) as { role?: string; phone?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = String(body.role ?? "").trim().slice(0, 80);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const note = String(body.note ?? "").trim().slice(0, 1000);

  if (!role) {
    return NextResponse.json({ error: "Tell us your role at this business." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const user = session.user;

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, title, claim_status")
    .eq("id", id)
    .maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if ((biz.claim_status as string) === "claimed") {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from("portal_review_items")
    .select("id")
    .eq("business_id", id)
    .eq("submitted_by", user.id)
    .eq("type", "claim")
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You already have a pending claim" }, { status: 409 });
  }

  const { data: reviewItem, error: reviewErr } = await supabase
    .from("portal_review_items")
    .insert({
      type: "claim",
      status: "pending",
      business_id: id,
      submitted_by: user.id,
      payload: {
        business_title: biz.title,
        role,
        phone: phone || null,
        note: note || null,
        submitter_email: user.email,
      },
    })
    .select("id")
    .single();

  if (reviewErr || !reviewItem) {
    return NextResponse.json({ error: reviewErr?.message ?? "Could not submit claim" }, { status: 500 });
  }

  await supabase.from("business_claim_requests").insert({
    business_id: id,
    user_id: user.id,
    status: "pending",
    claimant_note: note || null,
  });

  await supabase
    .from("businesses")
    .update({ claim_status: "pending_review" })
    .eq("id", id)
    .in("claim_status", ["unclaimed", "pending_review"]);

  if (user.email) {
    await sendPortalOwnerEmail({
      to: user.email,
      event: "claim_submitted",
      businessTitle: String(biz.title ?? "this business"),
    });
  }

  return NextResponse.json({ ok: true, review_item_id: reviewItem.id });
}
