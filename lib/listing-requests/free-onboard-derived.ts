import { uniqueSlug } from "@/lib/portal/slug";
import { FREE_ONBOARD_EXCERPT_MAX } from "@/lib/listing-requests/free-onboard-schema";

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
