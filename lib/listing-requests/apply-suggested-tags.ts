/** Promote free-intake suggested tags into vocabulary and onto the payload. */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  type FreeOnboardPayload,
} from "@/lib/listing-requests/free-onboard-schema";

/** Normalize a freeform suggestion into a vocabulary slug (snake_case). */
export function suggestionToVocabSlug(raw: string): string | null {
  const slug = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  if (!slug || !/^[a-z0-9_]+$/.test(slug)) return null;
  return slug;
}

export type ApplySuggestedTagsResult = {
  payload: FreeOnboardPayload;
  promotedSlugs: string[];
  skippedInvalid: string[];
};

/**
 * Upsert selected suggestions into `search_tags_vocabulary`, merge onto
 * `payload.search_tags` (max 6), and leave unselected / unfit ones on `suggested_tags`.
 */
export async function applySuggestedTagsToPayload(
  supabase: SupabaseClient,
  payload: FreeOnboardPayload,
  selectedSuggestions: string[],
): Promise<ApplySuggestedTagsResult> {
  const selectedKeys = new Set(
    selectedSuggestions.map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  const remainingSuggested: string[] = [];
  const skippedInvalid: string[] = [];
  const slugsToPromote: string[] = [];

  for (const raw of payload.suggested_tags ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!selectedKeys.has(trimmed.toLowerCase())) {
      remainingSuggested.push(trimmed);
      continue;
    }
    const slug = suggestionToVocabSlug(trimmed);
    if (!slug) {
      skippedInvalid.push(trimmed);
      remainingSuggested.push(trimmed);
      continue;
    }
    slugsToPromote.push(slug);
  }

  const uniquePromote = [...new Set(slugsToPromote)];
  if (uniquePromote.length > 0) {
    const { error } = await supabase.from("search_tags_vocabulary").upsert(
      uniquePromote.map((tag) => ({ tag })),
      { onConflict: "tag", ignoreDuplicates: true },
    );
    if (error) {
      throw new Error(`Could not add tags to vocabulary: ${error.message}`);
    }
  }

  const merged = [...(payload.search_tags ?? [])];
  const seen = new Set(merged.map((t) => t.toLowerCase()));
  const promotedSlugs: string[] = [];

  for (const slug of uniquePromote) {
    if (seen.has(slug)) continue;
    if (merged.length >= FREE_ONBOARD_SEARCH_TAGS_MAX) {
      // No room on the listing — keep the original phrases for a later pass.
      const originals = (payload.suggested_tags ?? []).filter(
        (raw) => suggestionToVocabSlug(raw) === slug && selectedKeys.has(raw.trim().toLowerCase()),
      );
      for (const original of originals.length > 0 ? originals : [slug]) {
        if (!remainingSuggested.some((r) => r.toLowerCase() === original.toLowerCase())) {
          remainingSuggested.push(original);
        }
      }
      continue;
    }
    merged.push(slug);
    seen.add(slug);
    promotedSlugs.push(slug);
  }

  return {
    payload: {
      ...payload,
      search_tags: merged.slice(0, FREE_ONBOARD_SEARCH_TAGS_MAX),
      suggested_tags: remainingSuggested,
    },
    promotedSlugs,
    skippedInvalid,
  };
}

/**
 * Load a free-intake review item, promote selected suggestions, and persist the payload.
 */
export async function promoteSelectedSuggestedTags(
  supabase: SupabaseClient,
  itemId: string,
  selectedSuggestions: string[],
): Promise<ApplySuggestedTagsResult | null> {
  if (selectedSuggestions.length === 0) return null;

  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");

  const payload = ((item.payload as Record<string, unknown>) ?? {}) as unknown as FreeOnboardPayload;
  const result = await applySuggestedTagsToPayload(supabase, payload, selectedSuggestions);

  const { error: saveErr } = await supabase
    .from("portal_review_items")
    .update({ payload: result.payload })
    .eq("id", itemId);
  if (saveErr) throw new Error(saveErr.message);

  return result;
}
