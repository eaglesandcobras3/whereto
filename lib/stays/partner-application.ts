import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { RentalPartnerApplication } from "@/lib/stays/partner-application-schema";

export async function submitRentalPartnerApplication(
  body: RentalPartnerApplication,
): Promise<{ partnerId: string; businessId: string | null }> {
  if (body._hp_company_website) {
    throw new Error("Rejected");
  }

  const supabase = getServiceSupabase();
  const displayName = (body.display_name || body.business_title || "").trim();
  if (displayName.length < 2) {
    throw new Error("Company or brand name is required.");
  }

  let businessId: string | null = body.business_id ?? null;
  if (!businessId && body.business_slug) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", body.business_slug)
      .maybeSingle();
    businessId = (data as { id?: string } | null)?.id ?? null;
  }

  const wantsPublicBusiness = body.link_public_business === true;
  if (wantsPublicBusiness && !businessId) {
    throw new Error(
      "Could not find that business listing. Check the slug/ID, or apply without a public company page.",
    );
  }
  if (!wantsPublicBusiness) {
    businessId = null;
  }

  const now = new Date().toISOString();
  const payload = {
    display_name: displayName,
    portfolio_size: body.portfolio_size,
    towns_served: body.towns_served,
    notes: body.notes,
    link_public_business: wantsPublicBusiness,
  };

  const fields = {
    business_id: businessId,
    display_name: displayName,
    show_public_business_profile: Boolean(businessId && wantsPublicBusiness),
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

  // Prefer updating an existing partner by linked business, else by contact email.
  let existingId: string | null = null;
  if (businessId) {
    const { data: byBiz } = await supabase
      .from("rental_partner_profiles")
      .select("id, status")
      .eq("business_id", businessId)
      .maybeSingle();
    if (byBiz?.id) existingId = byBiz.id as string;
  }
  if (!existingId) {
    const { data: byEmail } = await supabase
      .from("rental_partner_profiles")
      .select("id, status")
      .eq("contact_email", body.contact_email)
      .is("business_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail?.id) existingId = byEmail.id as string;
  }

  if (existingId) {
    const { data: existing } = await supabase
      .from("rental_partner_profiles")
      .select("status")
      .eq("id", existingId)
      .maybeSingle();
    const status = (existing?.status as string) ?? "";
    if (["active", "approved", "import_pending"].includes(status)) {
      throw new Error("An active or approved rental partner profile already exists for this contact.");
    }
    const { error } = await supabase
      .from("rental_partner_profiles")
      .update(fields)
      .eq("id", existingId);
    if (error) throw new Error(error.message);

    await supabase
      .from("portal_review_items")
      .insert({
        type: "rental_partner_application",
        status: "pending",
        business_id: businessId,
        submitted_by: null,
        payload: { partner_id: existingId, ...payload },
      })
      .then(({ error }) => {
        if (error) console.error("rental partner review queue insert:", error.message);
      });

    return { partnerId: existingId, businessId };
  }

  const { data: created, error } = await supabase
    .from("rental_partner_profiles")
    .insert(fields)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from("portal_review_items")
    .insert({
      type: "rental_partner_application",
      status: "pending",
      business_id: businessId,
      submitted_by: null,
      payload: { partner_id: created.id, ...payload },
    })
    .then(({ error: reviewErr }) => {
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
