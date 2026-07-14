import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFreeOnboardSeoDescription,
  buildFreeOnboardSeoTitle,
  buildFreeOnboardSlug,
} from "@/lib/listing-requests/free-onboard-derived";
import {
  FREE_ONBOARD_TYPES,
  type FreeOnboardLocationPayload,
  type FreeOnboardPayload,
} from "@/lib/listing-requests/free-onboard-schema";
import { buildSearchDocumentFields } from "@/lib/search/derive-search-document";

function asPayload(raw: Record<string, unknown>): FreeOnboardPayload {
  return raw as unknown as FreeOnboardPayload;
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
  return locations.length > 0 && locations.every((l) => l.status === "created" || l.status === "skipped");
}

async function finalizeIfComplete(
  supabase: SupabaseClient,
  itemId: string,
  reviewerId: string,
  payload: FreeOnboardPayload,
): Promise<"pending" | "approved"> {
  if (!allLocationsResolved(payload.locations)) return "pending";
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

export async function createFreeListingForLocation(
  supabase: SupabaseClient,
  itemId: string,
  locationId: string,
  reviewerId: string,
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

  const town = await resolveTown(supabase, loc.town_id);
  if (!town) throw new Error("Town not found");

  const taken = await loadTakenSlugs(supabase);
  const slug = buildFreeOnboardSlug(payload.title, town.slug, taken);
  const seoTitle = buildFreeOnboardSeoTitle(payload.title, town.title);
  const seoDescription = buildFreeOnboardSeoDescription(payload.excerpt);
  const searchDoc = buildSearchDocumentFields({
    title: payload.title,
    excerpt: payload.excerpt,
    business_type: null,
    search_keywords: payload.search_keywords,
  });

  const tags =
    payload.search_tags.length > 0
      ? payload.search_tags.slice(0, 6)
      : searchDoc.search_tags;

  const insertRow: Record<string, unknown> = {
    title: payload.title,
    slug,
    status: "published",
    town_id: loc.town_id,
    address: loc.address,
    website: payload.website,
    phone: payload.phone,
    excerpt: payload.excerpt,
    overview: payload.overview,
    content: payload.overview,
    is_storefront: payload.is_storefront,
    is_service_business: payload.is_service_business,
    claim_status: "unclaimed",
    published_at: new Date().toISOString(),
    primary_category_id: payload.category_id,
    search_tags: tags,
    search_keywords: payload.search_keywords,
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
  const reviewStatus = await finalizeIfComplete(supabase, itemId, reviewerId, payload);
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
  const reviewStatus = await finalizeIfComplete(supabase, itemId, reviewerId, payload);
  if (reviewStatus === "approved") {
    const anyCreated = payload.locations.some((l) => l.status === "created");
    if (!anyCreated) {
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
      return { reviewStatus: "pending" };
    }
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

  const payload = asPayload((item.payload as Record<string, unknown>) ?? {});
  let created = 0;
  for (const loc of payload.locations) {
    if (loc.status !== "pending") continue;
    await createFreeListingForLocation(supabase, itemId, loc.id, reviewerId);
    created += 1;
  }
  return { created };
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

  const { data: existing } = await supabase
    .from("businesses")
    .select("id, slug, title, town_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!existing) throw new Error("Business not found");

  const primaryLoc = payload.locations[0];
  const townId = primaryLoc?.town_id ?? (existing.town_id as string);
  const town = await resolveTown(supabase, townId);
  const seoTitle = buildFreeOnboardSeoTitle(payload.title, town?.title);
  const seoDescription = buildFreeOnboardSeoDescription(payload.excerpt);
  const searchDoc = buildSearchDocumentFields({
    title: payload.title,
    excerpt: payload.excerpt,
    business_type: null,
    search_keywords: payload.search_keywords,
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
    excerpt: payload.excerpt,
    overview: payload.overview,
    content: payload.overview,
    is_storefront: payload.is_storefront,
    is_service_business: payload.is_service_business,
    primary_category_id: payload.category_id,
    search_tags: tags,
    search_keywords: payload.search_keywords,
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

  // Extra locations beyond the first become new sibling listings
  for (const loc of payload.locations.slice(1)) {
    if (loc.status === "pending") {
      await createFreeListingForLocation(supabase, itemId, loc.id, reviewerId);
    }
  }

  const { data: refreshed } = await supabase
    .from("portal_review_items")
    .select("payload, status")
    .eq("id", itemId)
    .maybeSingle();
  if ((refreshed?.status as string) === "pending") {
    const latest = asPayload((refreshed?.payload as Record<string, unknown>) ?? payload);
    for (const loc of latest.locations) {
      if (loc.status === "pending") loc.status = "skipped";
    }
    await finalizeIfComplete(supabase, itemId, reviewerId, latest);
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
    .select("id, type, status")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");
  if (item.type !== FREE_ONBOARD_TYPES.newListing && item.type !== FREE_ONBOARD_TYPES.update) {
    throw new Error("Not a free intake item");
  }

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
}
