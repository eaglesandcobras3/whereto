import type { SearchResultPayload } from "@/lib/search/types";
import type {
  ActiveFilters,
  AreaResultCard,
  AreaResultsArtifact,
  AskArtifact,
  BusinessResultCard,
  BusinessResultsArtifact,
  GuideResultCard,
  GuideResultsArtifact,
  TownResultCard,
  TownResultsArtifact,
} from "@/lib/ask/types";

export function mapSearchToBusinessCards(
  payload: SearchResultPayload,
  reviewNotesByTitle?: Map<string, string>,
): BusinessResultCard[] {
  return payload.recommendations.map((rec) => {
    const b = rec.business;
    const vec = rec._vec_similarity ?? rec._composite ?? 0.5;
    const fromReview = reviewNotesByTitle?.get(b.name);
    const matchReason = fromReview ?? rec.explanation ?? rec.headline;
    const description = b.ai_summary?.trim() || null;
    return {
      id: rec.business_id,
      title: b.name,
      slug: b.slug ?? rec.business_id,
      town_or_area: b.town_name ?? null,
      category: b.category_name ?? null,
      excerpt: description,
      price_level: b.price_level ?? null,
      tags: rec.highlighted_tags?.length ? rec.highlighted_tags : b.tags ?? [],
      why_this_matched: description || matchReason,
      match_reason: matchReason,
      confidence_score: Math.round(vec * 100) / 100,
      source_status: "verified" as const,
      image_url: b.hero_image_url ?? b.image_url ?? null,
    };
  });
}

export function buildBusinessResultsArtifact(
  payload: SearchResultPayload,
  activeFilters: ActiveFilters,
  title?: string,
): BusinessResultsArtifact {
  const results = mapSearchToBusinessCards(payload);
  return {
    type: "business_results",
    title: title ?? (payload.summary || `Results for "${payload.query}"`),
    results,
    activeFilters: { ...activeFilters, query: payload.normalized_query || payload.query },
    relatedSearches: payload.suggestions,
  };
}

export function buildGuideResultsArtifact(
  guides: GuideResultCard[],
  activeFilters: ActiveFilters,
  title: string,
): GuideResultsArtifact {
  return {
    type: "guide_results",
    title,
    results: guides,
    activeFilters,
  };
}

export function buildTownResultsArtifact(
  towns: TownResultCard[],
  activeFilters: ActiveFilters,
  title: string,
): TownResultsArtifact {
  return {
    type: "town_results",
    title,
    results: towns,
    activeFilters,
  };
}

export function buildAreaResultsArtifact(
  areas: AreaResultCard[],
  activeFilters: ActiveFilters,
  title: string,
): AreaResultsArtifact {
  return {
    type: "area_results",
    title,
    results: areas,
    activeFilters,
  };
}

export function buildEmptyArtifact(
  message: string,
  suggestions?: string[],
): AskArtifact {
  return {
    type: "empty_state",
    title: "No matches yet",
    message,
    suggestions,
  };
}

export function buildSubmissionFormArtifact(
  prefill?: Record<string, string>,
): AskArtifact {
  return { type: "business_submission_form", prefill };
}

export function buildFeedbackFormArtifact(opts: {
  businessId?: string;
  listingContext?: string;
}): AskArtifact {
  return {
    type: "feedback_form",
    businessId: opts.businessId,
    listingContext: opts.listingContext,
  };
}

export function buildHandoffArtifact(
  taskId: string,
  message: string,
): AskArtifact {
  return {
    type: "human_handoff_status",
    taskId,
    status: "open",
    message,
  };
}
