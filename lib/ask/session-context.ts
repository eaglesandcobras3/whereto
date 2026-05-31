import type { ActiveFilters, RefinementHistoryEntry, SearchContext } from "@/lib/ask/types";

const TOWN_NAMES =
  /\b(seaside|rosemary\s*beach|alys\s*beach|watercolor|watersound|seagrove|grayton|santa\s*rosa|inlet\s*beach|blue\s*mountain|dune\s*allen|gulf\s*place)\b/i;

const NEARBY_FOLLOWUP =
  /\b(what else|anything else|else nearby|nearby|near here|around here|more options|other places|something else|while we're here)\b/i;

export type SessionSearchHints = {
  /** Town from prior search in this conversation — skip location clarifiers. */
  knownTown?: string;
  /** Dietary tags established in prior turns — skip dietary question. */
  knownDietaryTags?: string[];
  /** Vibe tags from prior filters — skip redundant vibe questions. */
  knownVibeTags?: string[];
  /** User is asking for more options near where they already searched. */
  isNearbyFollowUp?: boolean;
  /** Last business search query in this session. */
  recentSearchQuery?: string;
};

function townFromText(text: string): string | undefined {
  const match = text.match(TOWN_NAMES);
  return match?.[0]?.replace(/\s+/g, " ").trim();
}

function mergeUniqueTags(...lists: (string[] | undefined)[]): string[] {
  const out = new Set<string>();
  for (const list of lists) {
    for (const tag of list ?? []) out.add(tag);
  }
  return [...out];
}

/** Derive what we already know from the current Ask session. */
export function deriveSessionHints(opts: {
  message: string;
  activeFilters: ActiveFilters;
  searchContext: SearchContext;
  refinementHistory: RefinementHistoryEntry[];
}): SessionSearchHints {
  const historyTowns = opts.refinementHistory
    .map((e) => e.filtersAfter.town_or_area ?? townFromText(e.userMessage))
    .filter(Boolean) as string[];

  const knownTown =
    opts.activeFilters.town_or_area ??
    townFromText(opts.searchContext.lastQuery) ??
    townFromText(opts.message) ??
    historyTowns.at(-1);

  const historyDietary = opts.refinementHistory.flatMap((e) => e.filtersAfter.dietary_tags ?? []);
  const knownDietaryTags = mergeUniqueTags(opts.activeFilters.dietary_tags, historyDietary);

  const historyVibes = opts.refinementHistory.flatMap((e) => e.filtersAfter.tags ?? []);
  const knownVibeTags = mergeUniqueTags(opts.activeFilters.tags, historyVibes);

  const isNearbyFollowUp =
    Boolean(knownTown) &&
    NEARBY_FOLLOWUP.test(opts.message) &&
    !townFromText(opts.message);

  return {
    knownTown,
    knownDietaryTags: knownDietaryTags.length ? knownDietaryTags : undefined,
    knownVibeTags: knownVibeTags.length ? knownVibeTags : undefined,
    isNearbyFollowUp,
    recentSearchQuery:
      opts.searchContext.lastTool === "searchBusinesses" ? opts.searchContext.lastQuery : undefined,
  };
}

/** Apply session town when user asks for more nearby without naming a town. */
export function applySessionTownToInput<T extends { town_or_area?: string }>(
  input: T,
  hints?: SessionSearchHints,
): T {
  if (input.town_or_area?.trim() || !hints?.knownTown || !hints.isNearbyFollowUp) {
    return input;
  }
  return { ...input, town_or_area: hints.knownTown };
}
