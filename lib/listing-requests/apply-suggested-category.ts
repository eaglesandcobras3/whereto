/** Resolve free-intake suggested categories onto the review payload. */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { suggestionToVocabSlug } from "@/lib/listing-requests/apply-suggested-tags";
import {
  FREE_ONBOARD_SUGGESTED_CATEGORY_MAX,
  type FreeOnboardPayload,
} from "@/lib/listing-requests/free-onboard-schema";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export type CategoryResolution =
  | { mode: "create"; title: string }
  | { mode: "existing"; categoryId: string };

export type ApplySuggestedCategoryResult = {
  payload: FreeOnboardPayload;
  categoryId: string;
  categoryTitle: string;
  created: boolean;
};

function titleFromSuggestion(raw: string): string {
  return raw.trim().slice(0, FREE_ONBOARD_SUGGESTED_CATEGORY_MAX);
}

async function findCategoryBySlug(
  supabase: SupabaseClient,
  table: "business_categories" | "service_categories",
  slug: string,
): Promise<{ id: string; title: string } | null> {
  const { data } = await supabase
    .from(table)
    .select("id, title")
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();
  if (!data?.id) return null;
  return { id: String(data.id), title: String(data.title ?? slug) };
}

async function findCategoryById(
  supabase: SupabaseClient,
  table: "business_categories" | "service_categories",
  id: string,
): Promise<{ id: string; title: string } | null> {
  const { data } = await supabase
    .from(table)
    .select("id, title")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (!data?.id) return null;
  return { id: String(data.id), title: String(data.title ?? "") };
}

async function createCategory(
  supabase: SupabaseClient,
  table: "business_categories" | "service_categories",
  title: string,
  slug: string,
): Promise<{ id: string; title: string }> {
  const id = randomUUID();
  const { data, error } = await supabase
    .from(table)
    .insert({
      id,
      status: DIRECTUS_PUBLISHED_STATUS,
      title,
      slug,
      is_hidden_from_search: false,
    })
    .select("id, title")
    .single();
  if (error || !data) {
    throw new Error(`Could not create category: ${error?.message ?? "unknown error"}`);
  }
  return { id: String(data.id), title: String(data.title ?? title) };
}

/**
 * Create or map a category/specialty onto the free-intake payload.
 * Clears `suggested_category` once resolved.
 */
export async function applySuggestedCategoryToPayload(
  supabase: SupabaseClient,
  payload: FreeOnboardPayload,
  resolution: CategoryResolution,
): Promise<ApplySuggestedCategoryResult> {
  const isService = Boolean(payload.is_service_business);
  const table = isService ? "service_categories" : "business_categories";

  let categoryId: string;
  let categoryTitle: string;
  let created = false;

  if (resolution.mode === "existing") {
    const found = await findCategoryById(supabase, table, resolution.categoryId);
    if (!found) throw new Error("Choose a valid existing category.");
    categoryId = found.id;
    categoryTitle = found.title;
  } else {
    const title = titleFromSuggestion(resolution.title);
    if (!title) throw new Error("Enter a category title to create.");
    const slug = suggestionToVocabSlug(title);
    if (!slug) throw new Error("Could not build a category slug from that title.");

    const existing = await findCategoryBySlug(supabase, table, slug);
    if (existing) {
      categoryId = existing.id;
      categoryTitle = existing.title;
    } else {
      const createdRow = await createCategory(supabase, table, title, slug);
      categoryId = createdRow.id;
      categoryTitle = createdRow.title;
      created = true;
    }
  }

  const next: FreeOnboardPayload = {
    ...payload,
    suggested_category: null,
  };

  if (isService) {
    next.service_category_id = categoryId;
    next.service_category_title = categoryTitle;
    next.category_id = null;
    next.category_title = null;
  } else {
    next.category_id = categoryId;
    next.category_title = categoryTitle;
    next.service_category_id = null;
    next.service_category_title = null;
  }

  return { payload: next, categoryId, categoryTitle, created };
}

/**
 * Load a free-intake review item, resolve the category, and persist the payload.
 */
export async function resolveSuggestedCategory(
  supabase: SupabaseClient,
  itemId: string,
  resolution: CategoryResolution,
): Promise<ApplySuggestedCategoryResult> {
  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");

  const payload = ((item.payload as Record<string, unknown>) ?? {}) as unknown as FreeOnboardPayload;
  const result = await applySuggestedCategoryToPayload(supabase, payload, resolution);

  const { error: saveErr } = await supabase
    .from("portal_review_items")
    .update({ payload: result.payload })
    .eq("id", itemId);
  if (saveErr) throw new Error(saveErr.message);

  return result;
}

export function parseCategoryResolution(raw: unknown): CategoryResolution | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const mode = String(obj.mode ?? "").trim();
  if (mode === "create") {
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    if (!title) return null;
    return { mode: "create", title };
  }
  if (mode === "existing") {
    const categoryId = typeof obj.categoryId === "string" ? obj.categoryId.trim() : "";
    if (!categoryId) return null;
    return { mode: "existing", categoryId };
  }
  return null;
}
