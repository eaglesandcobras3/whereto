import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { RentalPartnerApplication } from "@/lib/stays/partner-application-schema";

export async function submitRentalPartnerApplication(
  body: RentalPartnerApplication,
): Promise<{ partnerId: string; businessId: string }> {
  if (body._hp_company_website) {
    throw new Error("Rejected");
  }

  const supabase = getServiceSupabase();
  let businessId = body.business_id ?? null;

  if (!businessId && body.business_slug) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", body.business_slug)
      .maybeSingle();
    businessId = (data as { id?: string } | null)?.id ?? null;
  }

  if (!businessId) {
    throw new Error(
      "Select an existing business, or list your business first, then apply as a rental partner.",
    );
  }

  const now = new Date().toISOString();
  const payload = {
    business_title: body.business_title,
    portfolio_size: body.portfolio_size,
    towns_served: body.towns_served,
    notes: body.notes,
  };

  const { data: existing } = await supabase
    .from("rental_partner_profiles")
    .select("id, status")
    .eq("business_id", businessId)
    .maybeSingle();

  const fields = {
    contact_name: body.contact_name,
    contact_email: body.contact_email,
    contact_phone: body.contact_phone,
    pms_name: body.pms_name || null,
    pms_other: body.pms_other || null,
    booking_engine_base_url: body.booking_engine_base_url,
    booking_url_template: body.booking_url_template || null,
    import_method: body.import_method,
    authority_attested_at: now,
    content_rights_attested_at: now,
    application_payload: payload,
    status: "submitted" as const,
    updated_at: now,
  };

  if (existing?.id) {
    const status = existing.status as string;
    if (["active", "approved", "import_pending"].includes(status)) {
      throw new Error("This business already has an active or approved rental partner profile.");
    }
    const { error } = await supabase
      .from("rental_partner_profiles")
      .update(fields)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);

    await supabase.from("portal_review_items").insert({
      type: "rental_partner_application",
      status: "pending",
      business_id: businessId,
      submitted_by: null,
      payload: { partner_id: existing.id, ...payload },
    }).then(({ error }) => {
      if (error) console.error("rental partner review queue insert:", error.message);
    });

    return { partnerId: existing.id as string, businessId };
  }

  const { data: created, error } = await supabase
    .from("rental_partner_profiles")
    .insert({
      business_id: businessId,
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("portal_review_items").insert({
    type: "rental_partner_application",
    status: "pending",
    business_id: businessId,
    submitted_by: null,
    payload: { partner_id: created.id, ...payload },
  }).then(({ error: reviewErr }) => {
    if (reviewErr) console.error("rental partner review queue insert:", reviewErr.message);
  });

  return { partnerId: created.id as string, businessId };
}

export async function setPartnerStatus(opts: {
  partnerId: string;
  status: string;
  adminNotes?: string | null;
  rejectedReason?: string | null;
  approvedBy?: string | null;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const patch: Record<string, unknown> = {
    status: opts.status,
    updated_at: new Date().toISOString(),
  };
  if (opts.adminNotes !== undefined) patch.admin_notes = opts.adminNotes;
  if (opts.rejectedReason !== undefined) patch.rejected_reason = opts.rejectedReason;
  if (opts.status === "approved" || opts.status === "active") {
    patch.approved_at = new Date().toISOString();
    if (opts.approvedBy) patch.approved_by = opts.approvedBy;
  }
  const { error } = await supabase
    .from("rental_partner_profiles")
    .update(patch)
    .eq("id", opts.partnerId);
  if (error) throw new Error(error.message);
}
