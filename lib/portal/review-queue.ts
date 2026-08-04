import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  approveAllFreeLocations,
  approveFreeRemoval,
  approveFreeUpdate,
  rejectFreeIntake,
} from "@/lib/listing-requests/free-onboard-queue";
import { FREE_ONBOARD_TYPES } from "@/lib/listing-requests/free-onboard-schema";
import { ensureBusinessSubscription } from "@/lib/portal/entitlements";
import { sendPortalOwnerEmail } from "@/lib/portal/notifications";
import { uniqueSlug } from "@/lib/portal/slug";
import { inferStorefrontCategoryId, inferBusinessType } from "@/lib/portal/infer-category";
import { buildSearchDocumentFields } from "@/lib/search/derive-search-document";
import { getSiteUrl } from "@/lib/site-url";

function publicListingUrl(slug: string | null | undefined): string | null {
  const s = typeof slug === "string" ? slug.trim() : "";
  if (!s) return null;
  return `${getSiteUrl().replace(/\/$/, "")}/business/${encodeURIComponent(s)}`;
}

type ReviewItemRow = {
  id: string;
  type: string;
  status: string;
  business_id: string | null;
  submitted_by: string | null;
  payload: Record<string, unknown>;
  admin_notes: string | null;
  created_at: string;
};

async function submitterEmail(
  supabase: SupabaseClient,
  userId: string | null,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const fromPayload = typeof payload.submitter_email === "string" ? payload.submitter_email : null;
  if (fromPayload) return fromPayload;
  if (!userId) return null;

  const { data } = await supabase.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** Resolve listing slug for submit-changes deep links (claim/edit/photo/update). */
async function resolveBusinessSlug(
  supabase: SupabaseClient,
  businessId: string | null,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const fromPayload = [payload.target_business_slug, payload.business_slug, payload.slug]
    .find((v) => typeof v === "string" && v.trim());
  if (typeof fromPayload === "string" && fromPayload.trim()) return fromPayload.trim();

  if (!businessId) return null;
  const { data } = await supabase.from("businesses").select("slug").eq("id", businessId).maybeSingle();
  const slug = typeof data?.slug === "string" ? data.slug.trim() : "";
  return slug || null;
}

async function approveClaim(
  supabase: SupabaseClient,
  item: ReviewItemRow,
  reviewerId: string,
): Promise<{ businessId: string; businessTitle: string; listingUrl: string | null }> {
  const businessId = item.business_id;
  if (!businessId) throw new Error("Claim missing business_id");
  if (!item.submitted_by) throw new Error("Claim missing submitter");

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, title, slug, claim_status")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) throw new Error("Business not found");
  if ((biz.claim_status as string) === "claimed") {
    throw new Error("Business already claimed");
  }

  const { error: memberErr } = await supabase.from("business_members").insert({
    business_id: businessId,
    user_id: item.submitted_by,
    role: "owner",
  });
  if (memberErr) throw new Error(memberErr.message);

  const { error: bizErr } = await supabase
    .from("businesses")
    .update({
      claim_status: "claimed",
      claimed_by_user_id: item.submitted_by,
    })
    .eq("id", businessId);
  if (bizErr) throw new Error(bizErr.message);

  await supabase
    .from("business_claim_requests")
    .update({ status: "approved" })
    .eq("business_id", businessId)
    .eq("user_id", item.submitted_by)
    .eq("status", "pending");

  await finalizeReviewItem(supabase, item.id, reviewerId, "approved", null);
  await ensureBusinessSubscription(supabase, businessId);

  const slug = typeof biz.slug === "string" ? biz.slug.trim() : "";
  return {
    businessId,
    businessTitle: (biz.title as string) ?? "your business",
    listingUrl: publicListingUrl(slug),
  };
}

async function approveEdit(
  supabase: SupabaseClient,
  item: ReviewItemRow,
  reviewerId: string,
): Promise<{ businessId: string; businessTitle: string; listingUrl: string | null }> {
  const businessId = item.business_id;
  if (!businessId) throw new Error("Edit missing business_id");

  const proposalId =
    typeof item.payload.proposal_id === "string" ? item.payload.proposal_id : null;
  if (!proposalId) throw new Error("Edit proposal id missing");

  const { data: proposal } = await supabase
    .from("business_edit_proposals")
    .select("id, changes, status")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) throw new Error("Edit proposal not found");
  if ((proposal.status as string) !== "pending") throw new Error("Proposal already processed");

  const changes = (proposal.changes as Record<string, unknown>) ?? {};
  if (Object.keys(changes).length === 0) throw new Error("No changes to apply");

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, title, slug")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) throw new Error("Business not found");

  const { error: updateErr } = await supabase
    .from("businesses")
    .update({ ...changes, is_verified: true })
    .eq("id", businessId);
  if (updateErr) throw new Error(updateErr.message);

  await supabase
    .from("business_edit_proposals")
    .update({ status: "approved" })
    .eq("id", proposalId);

  await finalizeReviewItem(supabase, item.id, reviewerId, "approved", null);

  return {
    businessId,
    businessTitle: (biz.title as string) ?? "your business",
    listingUrl: publicListingUrl(biz.slug as string | null),
  };
}

async function approvePhoto(
  _supabase: SupabaseClient,
  _item: ReviewItemRow,
  _reviewerId: string,
): Promise<{ businessId: string; businessTitle: string; listingUrl: string | null }> {
  // Temporarily disabled: writing hero_image_url / main_image_url fails because those
  // are businesses_view aliases, not table columns.
  throw new Error(
    "Photo approval is temporarily disabled. Reject or leave pending until image columns are fixed.",
  );
}

async function approveNewListing(
  supabase: SupabaseClient,
  item: ReviewItemRow,
  reviewerId: string,
): Promise<{ businessId: string; businessTitle: string; listingUrl: string | null }> {
  const listingRequestId =
    typeof item.payload.listing_request_id === "string" ? item.payload.listing_request_id : null;
  if (!listingRequestId) throw new Error("Listing request id missing");

  const { data: req } = await supabase
    .from("business_listing_requests")
    .select("*")
    .eq("id", listingRequestId)
    .maybeSingle();
  if (!req) throw new Error("Listing request not found");

  const title = String(req.title ?? "").trim();
  if (!title) throw new Error("Listing title missing");

  const { data: slugRows } = await supabase.from("businesses").select("slug");
  const taken = new Set((slugRows ?? []).map((r) => String((r as { slug: string }).slug)));
  const slug = uniqueSlug(title, taken);

  const description = (req.description as string | null) ?? null;
  const categoryId = await inferStorefrontCategoryId(supabase, {
    title,
    description,
    isServiceBusiness: Boolean(req.is_service_business),
  });
  const businessType =
    inferBusinessType(title, description, Boolean(req.is_service_business)) ?? null;
  const searchDoc = buildSearchDocumentFields({
    title,
    excerpt: String(req.description ?? "").slice(0, 500) || null,
    business_type: businessType,
    search_keywords: null,
  });

  if (!item.submitted_by) throw new Error("Listing submitter missing");

  // businesses.id has no DB default — must supply a UUID (same as CSV import paths).
  const insertRow: Record<string, unknown> = {
    id: randomUUID(),
    title,
    slug,
    status: "published",
    town_id: req.town_id as string,
    address: (req.address as string | null) ?? null,
    website: (req.website as string | null) ?? null,
    phone: (req.phone as string | null) ?? null,
    email: (req.email as string | null) ?? null,
    excerpt: String(req.description ?? "").slice(0, 500) || null,
    content: (req.description as string | null) ?? null,
    is_storefront: Boolean(req.is_storefront),
    is_service_business: Boolean(req.is_service_business),
    service_area: (req.service_area as string | null) ?? null,
    map_lat: (req.map_lat as number | null) ?? null,
    map_lng: (req.map_lng as number | null) ?? null,
    claim_status: "claimed",
    claimed_by_user_id: item.submitted_by,
    published_at: new Date().toISOString(),
    business_type: businessType,
    search_tags: searchDoc.search_tags,
    search_terms: searchDoc.search_terms,
    embedding_summary: searchDoc.embedding_summary,
    is_verified: true,
  };
  if (categoryId) insertRow.primary_category_id = categoryId;

  const { data: created, error: createErr } = await supabase
    .from("businesses")
    .insert(insertRow)
    .select("id, title")
    .single();
  if (createErr || !created) throw new Error(createErr?.message ?? "Could not create business");

  const businessId = created.id as string;

  await supabase.from("business_members").insert({
    business_id: businessId,
    user_id: item.submitted_by,
    role: "owner",
  });

  await supabase
    .from("business_listing_requests")
    .update({ status: "approved" })
    .eq("id", listingRequestId);

  await supabase
    .from("portal_review_items")
    .update({ business_id: businessId })
    .eq("id", item.id);

  await finalizeReviewItem(supabase, item.id, reviewerId, "approved", null);
  await ensureBusinessSubscription(supabase, businessId);

  return {
    businessId,
    businessTitle: (created.title as string) ?? title,
    listingUrl: publicListingUrl(slug),
  };
}

async function finalizeReviewItem(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
  status: "approved" | "rejected" | "needs_changes",
  adminNotes: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("portal_review_items")
    .update({
      status,
      admin_notes: adminNotes,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function approveReviewItem(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
): Promise<void> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, business_id, submitted_by, payload, admin_notes, created_at")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");

  const row = item as ReviewItemRow;
  let result: { businessId: string; businessTitle: string; listingUrl?: string | null };

  if (row.type === "claim") {
    result = await approveClaim(supabase, row, reviewerId);
    const email = await submitterEmail(supabase, row.submitted_by, row.payload);
    if (email) {
      await sendPortalOwnerEmail({
        to: email,
        event: "claim_approved",
        businessTitle: result.businessTitle,
        listingUrl: result.listingUrl,
      });
    }
    return;
  }

  if (row.type === "new_listing") {
    result = await approveNewListing(supabase, row, reviewerId);
    const email = await submitterEmail(supabase, row.submitted_by, row.payload);
    if (email) {
      await sendPortalOwnerEmail({
        to: email,
        event: "listing_approved",
        businessTitle: result.businessTitle,
        listingUrl: result.listingUrl,
      });
    }
    return;
  }

  if (row.type === "edit") {
    result = await approveEdit(supabase, row, reviewerId);
    const email = await submitterEmail(supabase, row.submitted_by, row.payload);
    if (email) {
      await sendPortalOwnerEmail({
        to: email,
        event: "edit_approved",
        businessTitle: result.businessTitle,
        listingUrl: result.listingUrl,
      });
    }
    return;
  }

  if (row.type === "photo") {
    result = await approvePhoto(supabase, row, reviewerId);
    const email = await submitterEmail(supabase, row.submitted_by, row.payload);
    if (email) {
      await sendPortalOwnerEmail({
        to: email,
        event: "photo_approved",
        businessTitle: result.businessTitle,
        listingUrl: result.listingUrl,
      });
    }
    return;
  }

  if (row.type === FREE_ONBOARD_TYPES.newListing) {
    await approveAllFreeLocations(supabase, itemId, reviewerId);
    return;
  }

  if (row.type === FREE_ONBOARD_TYPES.update) {
    await approveFreeUpdate(supabase, itemId, reviewerId);
    return;
  }

  if (row.type === FREE_ONBOARD_TYPES.removal) {
    await approveFreeRemoval(supabase, itemId, reviewerId);
    return;
  }

  throw new Error(`Approve not implemented for type: ${row.type}`);
}

export async function needsChangesReviewItem(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
  adminNotes: string | null,
): Promise<void> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, business_id, submitted_by, payload, admin_notes, created_at")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");

  const row = item as ReviewItemRow;

  if (row.type === "claim" && row.business_id) {
    await supabase
      .from("businesses")
      .update({ claim_status: "unclaimed" })
      .eq("id", row.business_id)
      .eq("claim_status", "pending_review");

    await supabase
      .from("business_claim_requests")
      .update({ status: "rejected" })
      .eq("business_id", row.business_id)
      .eq("user_id", row.submitted_by)
      .eq("status", "pending");
  }

  if (row.type === "new_listing") {
    const listingRequestId =
      typeof row.payload.listing_request_id === "string" ? row.payload.listing_request_id : null;
    if (listingRequestId) {
      await supabase
        .from("business_listing_requests")
        .update({ status: "rejected" })
        .eq("id", listingRequestId);
    }
  }

  if (row.type === "edit") {
    const proposalId =
      typeof row.payload.proposal_id === "string" ? row.payload.proposal_id : null;
    if (proposalId) {
      await supabase
        .from("business_edit_proposals")
        .update({ status: "rejected" })
        .eq("id", proposalId);
    }
  }

  if (row.type === "photo") {
    const photoId = typeof row.payload.photo_id === "string" ? row.payload.photo_id : null;
    if (photoId) {
      await supabase.from("business_photos").update({ status: "rejected" }).eq("id", photoId);
    }
  }

  await finalizeReviewItem(supabase, itemId, reviewerId, "needs_changes", adminNotes);

  const businessTitle =
    typeof row.payload.business_title === "string"
      ? row.payload.business_title
      : typeof row.payload.title === "string"
        ? row.payload.title
        : "your business";

  const email = await submitterEmail(supabase, row.submitted_by, row.payload);
  if (email) {
    await sendPortalOwnerEmail({
      to: email,
      event: "review_needs_changes",
      businessTitle,
      adminNotes,
      businessSlug: await resolveBusinessSlug(supabase, row.business_id, row.payload),
    });
  }
}

export async function rejectReviewItem(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
  adminNotes: string | null,
): Promise<void> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, business_id, submitted_by, payload, admin_notes, created_at")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");

  const row = item as ReviewItemRow;

  if (
    row.type === FREE_ONBOARD_TYPES.newListing ||
    row.type === FREE_ONBOARD_TYPES.update ||
    row.type === FREE_ONBOARD_TYPES.removal
  ) {
    await rejectFreeIntake(supabase, itemId, reviewerId, adminNotes);
    return;
  }

  if (row.type === "claim" && row.business_id) {
    await supabase
      .from("businesses")
      .update({ claim_status: "unclaimed" })
      .eq("id", row.business_id)
      .eq("claim_status", "pending_review");

    await supabase
      .from("business_claim_requests")
      .update({ status: "rejected" })
      .eq("business_id", row.business_id)
      .eq("user_id", row.submitted_by)
      .eq("status", "pending");
  }

  if (row.type === "new_listing") {
    const listingRequestId =
      typeof row.payload.listing_request_id === "string" ? row.payload.listing_request_id : null;
    if (listingRequestId) {
      await supabase
        .from("business_listing_requests")
        .update({ status: "rejected" })
        .eq("id", listingRequestId);
    }
  }

  if (row.type === "edit") {
    const proposalId =
      typeof row.payload.proposal_id === "string" ? row.payload.proposal_id : null;
    if (proposalId) {
      await supabase
        .from("business_edit_proposals")
        .update({ status: "rejected" })
        .eq("id", proposalId);
    }
  }

  if (row.type === "photo") {
    const photoId = typeof row.payload.photo_id === "string" ? row.payload.photo_id : null;
    if (photoId) {
      await supabase.from("business_photos").update({ status: "rejected" }).eq("id", photoId);
    }
  }

  await finalizeReviewItem(supabase, itemId, reviewerId, "rejected", adminNotes);

  const businessTitle =
    typeof row.payload.business_title === "string"
      ? row.payload.business_title
      : typeof row.payload.title === "string"
        ? row.payload.title
        : "your business";

  const email = await submitterEmail(supabase, row.submitted_by, row.payload);
  if (email) {
    const event =
      row.type === "claim"
        ? "claim_rejected"
        : row.type === "new_listing"
          ? "listing_rejected"
          : row.type === "edit"
            ? "edit_rejected"
            : row.type === "photo"
              ? "photo_rejected"
              : null;
    if (event) {
      await sendPortalOwnerEmail({
        to: email,
        event,
        businessTitle,
        adminNotes,
        businessSlug: await resolveBusinessSlug(supabase, row.business_id, row.payload),
      });
    }
  }
}
