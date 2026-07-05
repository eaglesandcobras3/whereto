import "server-only";

import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export type DiscoverSearchGapInput = {
  rawQuery: string;
  unresolvedTerms: string[];
  parsedCategory?: string;
  parsedTown?: string;
  parsedTags?: string[];
  expanded: boolean;
};

/** Load full search_tags_vocabulary from Supabase (cached per request). */
export async function loadSearchTagVocabulary(): Promise<ReadonlySet<string>> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("search_tags_vocabulary").select("tag");
  if (error) {
    console.error("loadSearchTagVocabulary", error);
    return new Set();
  }
  return new Set((data ?? []).map((row) => String((row as { tag: string }).tag)));
}

/**
 * Persist unresolved discover NL terms and emit a PostHog event for alerting.
 * Idempotent per normalized term via upsert + hit_count increment.
 */
export async function recordDiscoverSearchGaps(input: DiscoverSearchGapInput): Promise<void> {
  const terms = [...new Set(input.unresolvedTerms.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (!terms.length) return;

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  for (const term of terms) {
    const { data: existing, error: readErr } = await supabase
      .from("discover_search_gaps")
      .select("id, hit_count")
      .eq("term", term)
      .maybeSingle();

    if (readErr) {
      console.error("recordDiscoverSearchGaps read", readErr);
      continue;
    }

    if (existing) {
      const { error: updateErr } = await supabase
        .from("discover_search_gaps")
        .update({
          hit_count: (existing.hit_count as number) + 1,
          last_seen_at: now,
          last_raw_query: input.rawQuery,
          last_parsed_category: input.parsedCategory ?? null,
          last_parsed_town: input.parsedTown ?? null,
          last_parsed_tags: input.parsedTags ?? [],
          last_expanded: input.expanded,
        })
        .eq("id", existing.id);
      if (updateErr) console.error("recordDiscoverSearchGaps update", updateErr);
    } else {
      const { error: insertErr } = await supabase.from("discover_search_gaps").insert({
        term,
        hit_count: 1,
        first_seen_at: now,
        last_seen_at: now,
        last_raw_query: input.rawQuery,
        last_parsed_category: input.parsedCategory ?? null,
        last_parsed_town: input.parsedTown ?? null,
        last_parsed_tags: input.parsedTags ?? [],
        last_expanded: input.expanded,
        status: "open",
      });
      if (insertErr) console.error("recordDiscoverSearchGaps insert", insertErr);
    }
  }

  const posthog = getPostHogServerClient();
  if (posthog) {
    try {
      await posthog.capture({
        distinctId: "discover_nl_system",
        event: "discover_tag_unresolved",
        properties: {
          raw_query: input.rawQuery,
          unresolved_terms: terms,
          expanded: input.expanded,
          parsed_category: input.parsedCategory ?? null,
          parsed_town: input.parsedTown ?? null,
          parsed_tags: input.parsedTags ?? [],
          is_new_gap: terms.length > 0,
        },
      });
      await posthog.shutdown();
    } catch (err) {
      console.error("recordDiscoverSearchGaps posthog", err);
    }
  }
}

/** Filter unresolved terms to those absent from the live vocabulary. */
export function filterTermsMissingFromVocabulary(
  terms: string[],
  vocabulary: ReadonlySet<string>,
): string[] {
  return terms.filter((term) => {
    const slug = term.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    return slug.length >= 3 && !vocabulary.has(slug);
  });
}
