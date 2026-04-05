"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function resolveClaimAction(
  requestId: number,
  decision: "approved" | "rejected",
  adminNote: string,
): Promise<void> {
  const { user } = await requireAdmin();
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();
  const note = adminNote.trim().slice(0, 500);

  const { data: row } = await supabase
    .from("business_claim_requests")
    .select("id, business_id, user_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!row || (row.status as string) !== "pending") return;

  const businessId = row.business_id as string;
  const claimantId = row.user_id as string;

  await supabase
    .from("business_claim_requests")
    .update({
      status: decision,
      admin_note: note || null,
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq("id", requestId);

  if (decision === "approved") {
    await supabase
      .from("businesses")
      .update({
        claim_status: "claimed",
        claimed_by_user_id: claimantId,
      })
      .eq("id", businessId);

    await supabase
      .from("business_claim_requests")
      .update({
        status: "rejected",
        admin_note: "Superseded by approved claim",
        resolved_at: now,
        resolved_by: user.id,
      })
      .eq("business_id", businessId)
      .eq("status", "pending")
      .neq("id", requestId);
  } else {
    const { count } = await supabase
      .from("business_claim_requests")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "pending");
    if ((count ?? 0) === 0) {
      await supabase
        .from("businesses")
        .update({ claim_status: "unclaimed" })
        .eq("id", businessId)
        .eq("claim_status", "pending_review");
    }
  }

  revalidatePath("/admin/claims");
  revalidatePath("/business");
}

export async function resolveClaimFormAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("request_id"));
  const decision = String(formData.get("decision") ?? "");
  const adminNote = String(formData.get("admin_note") ?? "");
  if (!Number.isFinite(id)) return;
  if (decision !== "approved" && decision !== "rejected") return;
  await resolveClaimAction(id, decision, adminNote);
}
