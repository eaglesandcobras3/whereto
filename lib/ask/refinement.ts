import type {
  ActiveFilters,
  AskArtifact,
  RefinementHistoryEntry,
  RefinementIntent,
  SearchContext,
} from "@/lib/ask/types";

const PIVOT_PATTERNS =
  /\b(instead|rather|switch|show me|what about|change to|coffee|breakfast|lunch|dinner|shopping|activities|bars)\b/i;
const REFINE_PATTERNS =
  /\b(more|less|only|just|closer|near|walkable|casual|upscale|gluten|vegan|dog|kid|family|quiet|lively|open later|cheaper)\b/i;
const FORM_PATTERNS =
  /\b(list my business|add my business|submit.*listing|report.*wrong|incorrect info|feedback)\b/i;

export function classifyRefinementIntent(
  message: string,
  hasActiveArtifact: boolean,
  artifactType?: AskArtifact["type"],
): RefinementIntent {
  const m = message.trim().toLowerCase();
  if (artifactType === "clarification_form") return "refine";
  if (FORM_PATTERNS.test(m)) {
    if (/list|add|submit/.test(m)) return "form";
    if (/wrong|incorrect|feedback|report/.test(m)) return "form";
  }
  if (!hasActiveArtifact) return "new_search";
  if (PIVOT_PATTERNS.test(m) && /\b(instead|what about|show|switch)\b/i.test(m)) {
    return "pivot";
  }
  if (REFINE_PATTERNS.test(m)) return "refine";
  if (/\b(compare|which one|better|best of these)\b/i.test(m)) return "compare";
  if (/\b(find|search|where|recommend|best)\b/i.test(m) && m.length > 20) {
    return "new_search";
  }
  if (hasActiveArtifact) return "refine";
  return "general_q";
}

export function mergeFilters(
  base: ActiveFilters,
  patch: Partial<ActiveFilters>,
): ActiveFilters {
  return {
    ...base,
    ...patch,
    tags: patch.tags ?? base.tags,
    dietary_tags: patch.dietary_tags ?? base.dietary_tags,
    atmosphere_tags: patch.atmosphere_tags ?? base.atmosphere_tags,
    occasion_tags: patch.occasion_tags ?? base.occasion_tags,
  };
}

/** Build a natural-language query from filters + user refinement message. */
export function composeSearchQuery(
  filters: ActiveFilters,
  userMessage: string,
  intent: RefinementIntent,
): string {
  if (intent === "new_search" || intent === "pivot") {
    return userMessage.trim();
  }
  const parts: string[] = [];
  if (filters.query) parts.push(filters.query);
  parts.push(userMessage.trim());
  if (filters.town_or_area) parts.push(`near ${filters.town_or_area}`);
  if (filters.category) parts.push(filters.category.replace(/_/g, " "));
  return parts.filter(Boolean).join(" ");
}

export function shouldForkSession(intent: RefinementIntent): boolean {
  return intent === "new_search" || intent === "pivot";
}

export function isSearchResultsArtifact(
  artifact: AskArtifact | undefined,
): artifact is Extract<
  AskArtifact,
  | { type: "business_results" }
  | { type: "guide_results" }
  | { type: "town_results" }
  | { type: "area_results" }
> {
  return (
    artifact?.type === "business_results" ||
    artifact?.type === "guide_results" ||
    artifact?.type === "town_results" ||
    artifact?.type === "area_results"
  );
}

export function searchToolForArtifact(
  artifact: AskArtifact,
): SearchContext["lastTool"] {
  switch (artifact.type) {
    case "business_results":
      return "searchBusinesses";
    case "guide_results":
      return "searchGuides";
    case "town_results":
      return "searchTowns";
    case "area_results":
      return "searchAreas";
    default:
      return null;
  }
}

export function resultCountFromArtifact(artifact: AskArtifact): number {
  if (!isSearchResultsArtifact(artifact)) return 0;
  return artifact.results.length;
}

/** Merge NL refinement into filters and produce model/tool hints for the turn. */
export function refineSearch(opts: {
  message: string;
  intent: RefinementIntent;
  activeFilters: ActiveFilters;
  searchContext: SearchContext;
  refinementHistory: RefinementHistoryEntry[];
  existingArtifact?: AskArtifact;
}): {
  activeFilters: ActiveFilters;
  refinementHistory: RefinementHistoryEntry[];
  refinementHint?: string;
  forkSession: boolean;
  composedQuery: string;
} {
  const hasArtifact = isSearchResultsArtifact(opts.existingArtifact);
  const forkSession = shouldForkSession(opts.intent);
  let activeFilters = opts.activeFilters;
  const refinementHistory = [...opts.refinementHistory];

  if (opts.intent === "refine" || opts.intent === "compare") {
    activeFilters = mergeFilters(activeFilters, { query: opts.message });
    refinementHistory.push({
      at: new Date().toISOString(),
      userMessage: opts.message,
      intent: opts.intent,
      filtersAfter: activeFilters,
    });
  }

  const composedQuery = composeSearchQuery(activeFilters, opts.message, opts.intent);
  const refinementHint = hasArtifact
    ? `User intent: ${opts.intent}. ${
        forkSession
          ? "Start a new search."
          : `Refine existing results. Prior tool: ${opts.searchContext.lastTool ?? "searchBusinesses"}. Composed query hint: "${composedQuery}"`
      }`
    : undefined;

  return {
    activeFilters,
    refinementHistory,
    refinementHint,
    forkSession,
    composedQuery,
  };
}
