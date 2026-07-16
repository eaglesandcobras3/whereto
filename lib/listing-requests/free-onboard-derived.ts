import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import { uniqueSlug } from "@/lib/portal/slug";
import {
  FREE_ONBOARD_EXCERPT_MAX,
  FREE_ONBOARD_SEARCH_KEYWORDS_MAX,
} from "@/lib/listing-requests/free-onboard-schema";

/** SEO title from business title (± town), capped for meta. */
export function buildFreeOnboardSeoTitle(title: string, townTitle?: string | null): string {
  const base = title.trim();
  const town = (townTitle ?? "").trim();
  const combined = town ? `${base} | ${town}` : base;
  return combined.slice(0, 60);
}

/** SEO description from excerpt/summary. */
export function buildFreeOnboardSeoDescription(excerpt: string): string {
  return excerpt.trim().slice(0, FREE_ONBOARD_EXCERPT_MAX);
}

/** Unique slug from title + town slug. */
export function buildFreeOnboardSlug(
  title: string,
  townSlug: string | null | undefined,
  taken: Set<string>,
): string {
  const town = (townSlug ?? "").trim();
  const base = town ? `${title} ${town}` : title;
  return uniqueSlug(base, taken);
}

export type FreeOnboardSearchKeywordsInput = {
  title: string;
  isStorefront: boolean;
  isServiceBusiness: boolean;
  categoryTitle?: string | null;
  serviceCategoryTitle?: string | null;
  searchTags?: string[];
  suggestedTags?: string[];
};

/**
 * Build comma-separated SEO/search keywords from listing signals the submitter
 * already provides (name, storefront/service type, category, tags). Not shown on the form.
 */
export function buildFreeOnboardSearchKeywords(
  input: FreeOnboardSearchKeywordsInput,
): string | null {
  const parts: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | null | undefined) => {
    const phrase = (raw ?? "").trim().replace(/\s+/g, " ");
    if (!phrase) return;
    const key = phrase.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(phrase);
  };

  push(input.title);
  if (input.isServiceBusiness) push("service provider");
  else if (input.isStorefront) push("local business");

  const category = input.isServiceBusiness
    ? input.serviceCategoryTitle
    : input.categoryTitle;
  push(category);
  if (category?.trim()) push(`${category.trim()} on 30A`);

  for (const tag of [...(input.searchTags ?? []), ...(input.suggestedTags ?? [])]) {
    push(formatSearchTagLabel(tag));
  }

  if (parts.length === 0) return null;

  while (parts.length > 1 && parts.join(", ").length > FREE_ONBOARD_SEARCH_KEYWORDS_MAX) {
    parts.pop();
  }

  const joined = parts.join(", ").slice(0, FREE_ONBOARD_SEARCH_KEYWORDS_MAX).trim();
  return joined || null;
}
