/** Promote free-intake suggested tags into vocabulary and onto the payload. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
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

/**
 * Readable vocabulary description from a freeform suggestion.
 * Preserves short all-caps tokens (BBQ, HVAC); otherwise Title Cases words.
 */
export function suggestionToVocabDescription(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!cleaned) return "";
  if (!/\s/.test(cleaned) && cleaned.includes("_")) {
    return formatSearchTagLabel(cleaned);
  }
  return cleaned
    .split(" ")
    .map((word) => {
      if (word.length <= 5 && /^[A-Z0-9]+$/.test(word)) return word;
      if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(word)) return formatSearchTagLabel(word);
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export type SuggestedTagAction =
  | { from: string; action: "promote"; to?: string }
  | { from: string; action: "replace"; to: string }
  | { from: string; action: "discard" };

export type ApplySuggestedTagsResult = {
  payload: FreeOnboardPayload;
  promotedSlugs: string[];
  skippedInvalid: string[];
};

/**
 * Parse API body: either a legacy string[] of selections to promote,
 * or structured `{ from, action, to? }[]`.
 */
export function parseSuggestedTagActions(raw: unknown): SuggestedTagAction[] {
  if (!Array.isArray(raw)) return [];
  const out: SuggestedTagAction[] = [];

  for (const item of raw.slice(0, 12)) {
    if (typeof item === "string") {
      const from = item.trim();
      if (from) out.push({ from, action: "promote" });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const from = typeof obj.from === "string" ? obj.from.trim() : "";
    if (!from) continue;
    const action = String(obj.action ?? "").trim();
    const to = typeof obj.to === "string" ? obj.to.trim() : "";
    if (action === "discard") {
      out.push({ from, action: "discard" });
    } else if (action === "replace") {
      if (to) out.push({ from, action: "replace", to });
      else out.push({ from, action: "discard" });
    } else {
      // promote (default)
      out.push({ from, action: "promote", to: to || undefined });
    }
  }

  return out;
}

function isLegacyStringArray(raw: unknown): raw is string[] {
  return Array.isArray(raw) && raw.every((item) => typeof item === "string");
}

/**
 * Upsert promoted/replaced phrases into `search_tags_vocabulary` as
 * `{ tag: snake_case, description: readable }`, merge onto `payload.search_tags`
 * (max 6), and leave remaining suggestions on `suggested_tags`.
 *
 * - Legacy `string[]`: listed phrases are promoted; others stay on suggested_tags.
 * - Structured actions: promote / replace / discard per `from`; unmentioned stay.
 */
export async function applySuggestedTagsToPayload(
  supabase: SupabaseClient,
  payload: FreeOnboardPayload,
  actionsOrLegacy: SuggestedTagAction[] | string[],
): Promise<ApplySuggestedTagsResult> {
  const legacy = isLegacyStringArray(actionsOrLegacy);
  const actions = legacy
    ? parseSuggestedTagActions(actionsOrLegacy)
    : (actionsOrLegacy as SuggestedTagAction[]);

  const byFrom = new Map<string, SuggestedTagAction>();
  for (const a of actions) {
    byFrom.set(a.from.trim().toLowerCase(), a);
  }

  const remainingSuggested: string[] = [];
  const skippedInvalid: string[] = [];
  /** First-seen slug → readable description for vocabulary insert. */
  const promoteBySlug = new Map<string, string>();
  /** Original phrases that produced each slug (for overflow recovery). */
  const originalsBySlug = new Map<string, string[]>();

  for (const raw of payload.suggested_tags ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const action = byFrom.get(key);

    if (!action) {
      remainingSuggested.push(trimmed);
      continue;
    }

    if (action.action === "discard") {
      continue;
    }

    const phrase =
      action.action === "replace"
        ? action.to
        : action.to?.trim()
          ? action.to.trim()
          : trimmed;
    const slug = suggestionToVocabSlug(phrase);
    if (!slug) {
      skippedInvalid.push(phrase);
      remainingSuggested.push(trimmed);
      continue;
    }
    if (!promoteBySlug.has(slug)) {
      const description =
        suggestionToVocabDescription(phrase) || formatSearchTagLabel(slug);
      promoteBySlug.set(slug, description);
    }
    const list = originalsBySlug.get(slug) ?? [];
    list.push(trimmed);
    originalsBySlug.set(slug, list);
  }

  const uniquePromote = [...promoteBySlug.keys()];
  if (uniquePromote.length > 0) {
    const { error } = await supabase.from("search_tags_vocabulary").upsert(
      uniquePromote.map((tag) => ({
        tag,
        description: promoteBySlug.get(tag) ?? formatSearchTagLabel(tag),
      })),
      { onConflict: "tag", ignoreDuplicates: true },
    );
    if (error) {
      throw new Error(`Could not add tags to vocabulary: ${error.message}`);
    }

    // Link promoted tags to the listing subcategory so they appear under
    // "Suggested for this category" on the next free-intake form.
    const categoryId =
      typeof payload.category_id === "string" ? payload.category_id.trim() : "";
    if (categoryId) {
      const { error: linkErr } = await supabase.from("search_tag_categories").upsert(
        uniquePromote.map((tag) => ({ tag, category_id: categoryId })),
        { onConflict: "tag,category_id", ignoreDuplicates: true },
      );
      if (linkErr) {
        throw new Error(`Could not link tags to category: ${linkErr.message}`);
      }
    }
  }

  const merged = [...(payload.search_tags ?? [])];
  const seen = new Set(merged.map((t) => t.toLowerCase()));
  const promotedSlugs: string[] = [];

  for (const slug of uniquePromote) {
    if (seen.has(slug)) continue;
    if (merged.length >= FREE_ONBOARD_SEARCH_TAGS_MAX) {
      for (const original of originalsBySlug.get(slug) ?? [slug]) {
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
 * Load a free-intake review item, apply tag actions, and persist the payload.
 */
export async function promoteSelectedSuggestedTags(
  supabase: SupabaseClient,
  itemId: string,
  actionsOrLegacy: SuggestedTagAction[] | string[],
): Promise<ApplySuggestedTagsResult | null> {
  const actions = isLegacyStringArray(actionsOrLegacy)
    ? parseSuggestedTagActions(actionsOrLegacy)
    : (actionsOrLegacy as SuggestedTagAction[]);

  if (actions.length === 0) return null;

  const { data: item, error } = await supabase
    .from("portal_review_items")
    .select("id, status, payload")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Review item not found");
  if ((item.status as string) !== "pending") throw new Error("Item already reviewed");

  const payload = ((item.payload as Record<string, unknown>) ?? {}) as unknown as FreeOnboardPayload;
  const result = await applySuggestedTagsToPayload(supabase, payload, actions);

  const { error: saveErr } = await supabase
    .from("portal_review_items")
    .update({ payload: result.payload })
    .eq("id", itemId);
  if (saveErr) throw new Error(saveErr.message);

  return result;
}
