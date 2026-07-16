import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFreeOnboardSearchKeywords,
  buildFreeOnboardSeoDescription,
  buildFreeOnboardSeoTitle,
  buildFreeOnboardSlug,
} from "@/lib/listing-requests/free-onboard-derived";
import { sendFreeOnboardSubmitterEmail } from "@/lib/listing-requests/free-onboard-notify";
import {
  FREE_ONBOARD_TYPES,
  type FreeOnboardLocationPayload,
  type FreeOnboardPayload,
  type FreeOnboardRemovalPayload,
} from "@/lib/listing-requests/free-onboard-schema";
import { buildSearchDocumentFields } from "@/lib/search/derive-search-document";

function asPayload(raw: Record<string, unknown>): FreeOnboardPayload {
  return raw as unknown as FreeOnboardPayload;
}

function asRemovalPayload(raw: Record<string, unknown>): FreeOnboardRemovalPayload {
  return raw as unknown as FreeOnboardRemovalPayload;
}

/** Prefer generated keywords from listing signals; fall back to an existing value. */
function resolveSearchKeywords(
  payload: FreeOnboardPayload,
  existing?: string | null,
): string | null {
  return (
    buildFreeOnboardSearchKeywords({
      title: payload.title,
      isStorefront: payload.is_storefront,
      isServiceBusiness: payload.is_service_business,
      categoryTitle: payload.category_title,
      serviceCategoryTitle: payload.service_category_title,
      searchTags: payload.search_tags,
      suggestedTags: payload.suggested_tags,
    }) ||
    existing ||
    null
  );
}

function createdListingSlugs(payload: FreeOnboardPayload): string[] {
  return payload.locations
    .filter((l) => l.status === "created" && l.resulting_business_slug)
    .map((l) => String(l.resulting_business_slug));
}

/**
 * One email per intake form submission — never per location.
 * Guards with `submitter_notified` so approve-all / multi-create cannot double-send.
 */
async function notifySubmitterOnce(
  supabase: SupabaseClient,
  itemId: string,
  payload: FreeOnboardPayload | FreeOnboardRemovalPayload,
  opts: {
    event: "approved" | "rejected";
    isUpdate: boolean;
    isRemoval?: boolean;
    adminNotes?: string | null;
  },
): Promise<void> {
  if (payload.submitter_notified) return;
  const to = payload.submitter_email?.trim();
  if (!to) return;

  await sendFreeOnboardSubmitterEmail({
    to,
    event: opts.event,
    businessTitle: payload.title || "your business",
    listingPaths:
      opts.event === "approved" && !opts.isRemoval && "locations" in payload
        ? createdListingSlugs(payload)
        : undefined,
    adminNotes: opts.adminNotes,
    isUpdate: opts.isUpdate,
    isRemoval: opts.isRemoval === true,
    businessSlug:
      "target_business_slug" in payload && typeof payload.target_business_slug === "string"
        ? payload.target_business_slug.trim() || null
        : null,
  });

  payload.submitter_notified = true;
  if ("locations" in payload) {
    await savePayload(supabase, itemId, payload);
  } else {
    await saveRemovalPayload(supabase, itemId, payload);
  }
}

async function loadTakenSlugs(supabase: SupabaseClient): Promise<Set<string>> {
  const { data: slugRows } = await supabase.from("businesses").select("slug");
  return new Set((slugRows ?? []).map((r) => String((r as { slug: string }).slug)));
}

async function resolveTown(
  supabase: SupabaseClient,
  townId: string,
): Promise<{ id: string; title: string; slug: string } | null> {
  const { data } = await supabase
    .from("towns")
    .select("id, title, slug")
    .eq("id", townId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id),
    title: String(data.title ?? ""),
    slug: String(data.slug ?? ""),
  };
}

function allLocationsResolved(locations: FreeOnboardLocationPayload[]): boolean {
  if (locations.length === 0) return true;
  return locations.every((l) => l.status === "created" || l.status === "skipped");
}

async function finalizeIfComplete(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
  payload: FreeOnboardPayload,
  opts?: { isUpdate?: boolean; notify?: boolean },
): Promise<"pending" | "approved"> {
  if (!allLocationsResolved(payload.locations)) return "pending";
  // Service-only intakes may have zero locations; updates can also approve with no location rows.
  const anyCreated =
    payload.locations.length === 0
      ? opts?.isUpdate === true || payload.is_service_business
      : payload.locations.some((l) => l.status === "created");
  if (!anyCreated) return "pending";

  const { error } = await supabase
    .from("portal_review_items")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      payload,
    })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  if (opts?.notify !== false) {
    await notifySubmitterOnce(supabase, itemId, payload, {
      event: "approved",
      isUpdate: opts?.isUpdate === true,
    });
  }
  return "approved";
}

async function savePayload(
  supabase: SupabaseClient,
  itemId: string,
  payload: FreeOnboardPayload,
  businessId?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = { payload };
  if (businessId) patch.business_id = businessId;
  const { error } = await supabase.from("portal_review_items").update(patch).eq("id", itemId);
  if (error) throw new Error(error.message);
}

async function saveRemovalPayload(
  supabase: SupabaseClient,
  itemId: string,
  payload: FreeOnboardRemovalPayload,
): Promise<void> {
  const { error } = await supabase
    .from("portal_review_items")
    .update({ payload })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
}

function assertCategoryResolved(payload: FreeOnboardPayload): void {
  if (payload.is_service_business) {
    if (!payload.service_category_id) {
      throw new Error(
        "Resolve the service specialty before approving (create the suggestion or pick an existing one).",
      );
    }
    return;
  }
  if (payload.is_storefront && !payload.category_id) {
    throw new Error(
      "Resolve the category before approving (create the suggestion or pick an existing one).",
    );
  }
}

export async function createFreeListingForLocation(
  supabase: SupabaseClient,
  itemId: string,
  locationId: string,
  reviewerId: string,
  opts?: { deferNotify?: boolean },
): Promise<{ businessId: string; businessSlug: string; reviewStatus: "pending" | "approved" }> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
  if (item.type !== FREE_ONBOARD_TYPES.newListing && item.type !== FREE_ONBOARD_TYPES.update) {
    throw new Error("Not a free intake item");
  }

  const payload = asPayload((item.payload as Record<string, unknown>) ?? {});
  const loc = payload.locations.find((l) => l.id === locationId);
  if (!loc) throw new Error("Location not found");
  if (loc.status !== "pending") throw new Error("Location already handled");
  assertCategoryResolved(payload);

  const town = await resolveTown(supabase, loc.town_id);
  if (!town) throw new Error("Town not found");

  const taken = await loadTakenSlugs(supabase);
  const slug = buildFreeOnboardSlug(payload.title, town.slug, taken);
  const seoTitle = buildFreeOnboardSeoTitle(payload.title, town.title);
  const seoDescription = buildFreeOnboardSeoDescription(payload.excerpt);
  const searchKeywords = resolveSearchKeywords(payload);
  const searchDoc = buildSearchDocumentFields({
    title: payload.title,
    excerpt: payload.excerpt,
    business_type: null,
    search_keywords: searchKeywords,
  });

  const tags =
    payload.search_tags.length > 0
      ? payload.search_tags.slice(0, 6)
      : searchDoc.search_tags;

  // businesses.id has no DB default — must supply a UUID (same as CSV import paths).
  const insertRow: Record<string, unknown> = {
    id: randomUUID(),
    title: payload.title,
    slug,
    status: "published",
    town_id: loc.town_id,
    address: loc.address,
    website: payload.website,
    phone: payload.phone,
    email: payload.submitter_email,
    excerpt: payload.excerpt,
    overview: payload.overview,
    content: payload.overview,
    is_storefront: payload.is_storefront,
    is_service_business: payload.is_service_business,
    claim_status: "unclaimed",
    published_at: new Date().toISOString(),
    primary_category_id: payload.is_service_business ? null : payload.category_id,
    service_category_id: payload.is_service_business
      ? (payload.service_category_id ?? null)
      : null,
    search_tags: tags,
    search_keywords: searchKeywords,
    search_terms: searchDoc.search_terms,
    embedding_summary: searchDoc.embedding_summary,
    seo_title: seoTitle,
    seo_description: seoDescription,
  };

  const { data: created, error: createErr } = await supabase
    .from("businesses")
    .insert(insertRow)
    .select("id, slug")
    .single();
  if (createErr || !created) throw new Error(createErr?.message ?? "Could not create business");

  loc.status = "created";
  loc.resulting_business_id = created.id as string;
  loc.resulting_business_slug = created.slug as string;
  loc.town_title = town.title;
  loc.town_slug = town.slug;

  await savePayload(supabase, itemId, payload, created.id as string);
  const isUpdate = item.type === FREE_ONBOARD_TYPES.update;
  const reviewStatus = await finalizeIfComplete(supabase, itemId, reviewerId, payload, {
    isUpdate,
    notify: opts?.deferNotify !== true,
  });
  return {
    businessId: created.id as string,
    businessSlug: created.slug as string,
    reviewStatus,
  };
}

export async function skipFreeListingLocation(
  supabase: SupabaseClient,
  itemId: string,
  locationId: string,
  reviewerId: string,
): Promise<{ reviewStatus: "pending" | "approved" }> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
  if (item.type !== FREE_ONBOARD_TYPES.newListing && item.type !== FREE_ONBOARD_TYPES.update) {
    throw new Error("Not a free intake item");
  }

  const payload = asPayload((item.payload as Record<string, unknown>) ?? {});
  const loc = payload.locations.find((l) => l.id === locationId);
  if (!loc) throw new Error("Location not found");
  if (loc.status !== "pending") throw new Error("Location already handled");

  loc.status = "skipped";
  await savePayload(supabase, itemId, payload);
  const isUpdate = item.type === FREE_ONBOARD_TYPES.update;
  const reviewStatus = await finalizeIfComplete(supabase, itemId, reviewerId, payload, {
    isUpdate,
  });
  if (
    allLocationsResolved(payload.locations) &&
    !payload.locations.some((l) => l.status === "created")
  ) {
      // All skipped — treat as rejected rather than approved empty
      await supabase
        .from("portal_review_items")
        .update({
          status: "rejected",
          admin_notes: "All locations skipped",
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          payload,
        })
        .eq("id", itemId);
      const to = payload.submitter_email?.trim();
      if (to) {
        await notifySubmitterOnce(supabase, itemId, payload, {
          event: "rejected",
          isUpdate,
          adminNotes: "All locations were skipped during review.",
        });
      }
      return { reviewStatus: "pending" };
  }
  return { reviewStatus };
}

export async function approveAllFreeLocations(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
): Promise<{ created: number }> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");

  const starting = asPayload((item.payload as Record<string, unknown>) ?? {});
  let created = 0;

  // Service-only intakes may have no location rows — create one listing without a town.
  if (starting.locations.length === 0 && starting.is_service_business) {
    await createFreeServiceListingWithoutTown(supabase, itemId, reviewerId, {
      deferNotify: true,
    });
    created = 1;
  } else {
    for (const loc of starting.locations) {
      if (loc.status !== "pending") continue;
      // Defer submitter email until every location is handled — one email per form.
      await createFreeListingForLocation(supabase, itemId, loc.id, reviewerId, {
        deferNotify: true,
      });
      created += 1;
    }
  }

  const { data: refreshed } = await supabase
    .from("portal_review_items")
    .select("payload, status, type")
    .eq("id", itemId)
    .maybeSingle();
  const payload = asPayload((refreshed?.payload as Record<string, unknown>) ?? starting);
  if ((refreshed?.status as string) === "approved") {
    await notifySubmitterOnce(supabase, itemId, payload, {
      event: "approved",
      isUpdate: refreshed?.type === FREE_ONBOARD_TYPES.update,
    });
  } else if ((refreshed?.status as string) === "pending") {
    await finalizeIfComplete(supabase, itemId, reviewerId, payload, {
      isUpdate: item.type === FREE_ONBOARD_TYPES.update,
      notify: true,
    });
  }
  return { created };
}

/** Create a single listing for a service-only intake with no town/address rows. */
async function createFreeServiceListingWithoutTown(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
  opts?: { deferNotify?: boolean },
): Promise<{ businessId: string; businessSlug: string; reviewStatus: "pending" | "approved" }> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
  if (item.type !== FREE_ONBOARD_TYPES.newListing) {
    throw new Error("Service-only create is for new listings");
  }

  const payload = asPayload((item.payload as Record<string, unknown>) ?? {});
  if (!payload.is_service_business || payload.locations.length > 0) {
    throw new Error("Not a zero-location service intake");
  }
  assertCategoryResolved(payload);

  const taken = await loadTakenSlugs(supabase);
  const slug = buildFreeOnboardSlug(payload.title, null, taken);
  const seoTitle = buildFreeOnboardSeoTitle(payload.title, undefined);
  const seoDescription = buildFreeOnboardSeoDescription(payload.excerpt);
  const searchKeywords = resolveSearchKeywords(payload);
  const searchDoc = buildSearchDocumentFields({
    title: payload.title,
    excerpt: payload.excerpt,
    business_type: null,
    search_keywords: searchKeywords,
  });
  const tags =
    payload.search_tags.length > 0
      ? payload.search_tags.slice(0, 6)
      : searchDoc.search_tags;

  // businesses.id has no DB default — must supply a UUID (same as CSV import paths).
  const insertRow: Record<string, unknown> = {
    id: randomUUID(),
    title: payload.title,
    slug,
    status: "published",
    town_id: null,
    address: null,
    website: payload.website,
    phone: payload.phone,
    email: payload.submitter_email,
    excerpt: payload.excerpt,
    overview: payload.overview,
    content: payload.overview,
    is_storefront: false,
    is_service_business: true,
    claim_status: "unclaimed",
    published_at: new Date().toISOString(),
    primary_category_id: null,
    service_category_id: payload.service_category_id ?? null,
    search_tags: tags,
    search_keywords: searchKeywords,
    search_terms: searchDoc.search_terms,
    embedding_summary: searchDoc.embedding_summary,
    seo_title: seoTitle,
    seo_description: seoDescription,
  };

  const { data: createdBiz, error: createErr } = await supabase
    .from("businesses")
    .insert(insertRow)
    .select("id, slug")
    .single();
  if (createErr || !createdBiz) throw new Error(createErr?.message ?? "Could not create business");

  // Synthetic resolved location so finalize/email link paths stay consistent.
  payload.locations = [
    {
      id: `svc-${crypto.randomUUID().slice(0, 8)}`,
      town_id: "",
      town_title: null,
      town_slug: null,
      address: null,
      status: "created",
      resulting_business_id: createdBiz.id as string,
      resulting_business_slug: createdBiz.slug as string,
    },
  ];

  await savePayload(supabase, itemId, payload, createdBiz.id as string);
  const reviewStatus = await finalizeIfComplete(supabase, itemId, reviewerId, payload, {
    isUpdate: false,
    notify: opts?.deferNotify !== true,
  });
  return {
    businessId: createdBiz.id as string,
    businessSlug: createdBiz.slug as string,
    reviewStatus,
  };
}

export async function approveFreeUpdate(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
): Promise<{ businessId: string }> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, business_id, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
  if (item.type !== FREE_ONBOARD_TYPES.update) throw new Error("Not a free update item");

  const payload = asPayload((item.payload as Record<string, unknown>) ?? {});
  const businessId = payload.target_business_id ?? (item.business_id as string | null);
  if (!businessId) throw new Error("Update missing target business");
  assertCategoryResolved(payload);

  const { data: existing } = await supabase
    .from("businesses")
    .select("id, slug, title, town_id, search_keywords")
    .eq("id", businessId)
    .maybeSingle();
  if (!existing) throw new Error("Business not found");

  // Keywords are generated from name/type/category/tags — not collected on the form.
  const searchKeywords = resolveSearchKeywords(
    payload,
    (existing.search_keywords as string | null) ?? null,
  );

  const primaryLoc = payload.locations[0];
  const townId = primaryLoc?.town_id ?? (existing.town_id as string);
  const town = await resolveTown(supabase, townId);
  const seoTitle = buildFreeOnboardSeoTitle(payload.title, town?.title);
  const seoDescription = buildFreeOnboardSeoDescription(payload.excerpt);
  const searchDoc = buildSearchDocumentFields({
    title: payload.title,
    excerpt: payload.excerpt,
    business_type: null,
    search_keywords: searchKeywords,
  });
  const tags =
    payload.search_tags.length > 0
      ? payload.search_tags.slice(0, 6)
      : searchDoc.search_tags;

  const titleChanged = String(existing.title) !== payload.title;
  const townChanged = townId !== existing.town_id;
  let slug = existing.slug as string;
  if (titleChanged || townChanged) {
    const taken = await loadTakenSlugs(supabase);
    taken.delete(slug);
    slug = buildFreeOnboardSlug(payload.title, town?.slug, taken);
  }

  const updates: Record<string, unknown> = {
    title: payload.title,
    slug,
    town_id: townId,
    address: primaryLoc?.address ?? null,
    website: payload.website,
    phone: payload.phone,
    email: payload.submitter_email,
    excerpt: payload.excerpt,
    overview: payload.overview,
    content: payload.overview,
    is_storefront: payload.is_storefront,
    is_service_business: payload.is_service_business,
    primary_category_id: payload.is_service_business ? null : payload.category_id,
    service_category_id: payload.is_service_business
      ? (payload.service_category_id ?? null)
      : null,
    search_tags: tags,
    search_keywords: searchKeywords,
    search_terms: searchDoc.search_terms,
    embedding_summary: searchDoc.embedding_summary,
    seo_title: seoTitle,
    seo_description: seoDescription,
  };

  const { error: updateErr } = await supabase.from("businesses").update(updates).eq("id", businessId);
  if (updateErr) throw new Error(updateErr.message);

  if (primaryLoc) {
    primaryLoc.status = "created";
    primaryLoc.resulting_business_id = businessId;
    primaryLoc.resulting_business_slug = slug;
  }
  await savePayload(supabase, itemId, payload, businessId);

  // Extra locations beyond the first become new sibling listings (no per-location emails).
  for (const loc of payload.locations.slice(1)) {
    if (loc.status === "pending") {
      await createFreeListingForLocation(supabase, itemId, loc.id, reviewerId, {
        deferNotify: true,
      });
    }
  }

  const { data: refreshed } = await supabase
    .from("portal_review_items")
    .select("payload, status")
    .eq("id", itemId)
    .maybeSingle();
  const latest = asPayload((refreshed?.payload as Record<string, unknown>) ?? payload);
  if ((refreshed?.status as string) === "pending") {
    for (const loc of latest.locations) {
      if (loc.status === "pending") loc.status = "skipped";
    }
    await finalizeIfComplete(supabase, itemId, reviewerId, latest, {
      isUpdate: true,
      notify: true,
    });
  } else if ((refreshed?.status as string) === "approved") {
    await notifySubmitterOnce(supabase, itemId, latest, {
      event: "approved",
      isUpdate: true,
    });
  }

  return { businessId };
}

export async function rejectFreeIntake(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
  adminNotes: string | null,
): Promise<void> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
  if (
    item.type !== FREE_ONBOARD_TYPES.newListing &&
    item.type !== FREE_ONBOARD_TYPES.update &&
    item.type !== FREE_ONBOARD_TYPES.removal
  ) {
    throw new Error("Not a free intake item");
  }

  const isRemoval = item.type === FREE_ONBOARD_TYPES.removal;
  const raw = (item.payload as Record<string, unknown>) ?? {};
  const { error: updErr } = await supabase
    .from("portal_review_items")
    .update({
      status: "rejected",
      admin_notes: adminNotes,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (updErr) throw new Error(updErr.message);

  if (isRemoval) {
    await notifySubmitterOnce(supabase, itemId, asRemovalPayload(raw), {
      event: "rejected",
      isUpdate: false,
      isRemoval: true,
      adminNotes,
    });
  } else {
    await notifySubmitterOnce(supabase, itemId, asPayload(raw), {
      event: "rejected",
      isUpdate: item.type === FREE_ONBOARD_TYPES.update,
      adminNotes,
    });
  }
}

/** Soft-archive the target listing after admin confirms the removal request. */
export async function approveFreeRemoval(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
): Promise<{ businessId: string }> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, type, status, business_id, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
  if (item.type !== FREE_ONBOARD_TYPES.removal) throw new Error("Not a free removal item");

  const payload = asRemovalPayload((item.payload as Record<string, unknown>) ?? {});
  const businessId = payload.target_business_id ?? (item.business_id as string | null);
  if (!businessId) throw new Error("Removal missing target business");

  const { data: existing } = await supabase
    .from("businesses")
    .select("id, title, slug, archived_at")
    .eq("id", businessId)
    .maybeSingle();
  if (!existing) throw new Error("Business not found");

  if (!existing.archived_at) {
    const now = new Date().toISOString();
    const { error: archErr } = await supabase
      .from("businesses")
      .update({
        status: "archived",
        archived_at: now,
        is_hidden_from_search: true,
      })
      .eq("id", businessId);
    if (archErr) throw new Error(archErr.message);
  }

  if (!payload.title && existing.title) {
    payload.title = String(existing.title);
  }

  const { error: updErr } = await supabase
    .from("portal_review_items")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      business_id: businessId,
      payload,
    })
    .eq("id", itemId);
  if (updErr) throw new Error(updErr.message);

  await notifySubmitterOnce(supabase, itemId, payload, {
    event: "approved",
    isUpdate: false,
    isRemoval: true,
  });

  return { businessId };
}
