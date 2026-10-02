import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";

export type HomePortraitItem = {
  href: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  eyebrow: string | null;
  ctaLabel: string;
  analyticsCategory: string;
  analyticsLabel: string;
};

const GUIDE_TYPE_EYEBROW: Record<string, string> = {
  editorial: "Guide",
  seasonal: "Seasonal",
  town: "Town Guide",
  intent: "Planning",
};

/** Category label for homepage portrait cards (object or one-element array embed). */
export function categoryEyebrowFromEmbed(
  embed:
    | { slug?: string | null; title?: string | null }
    | { slug?: string | null; title?: string | null }[]
    | null
    | undefined,
): string | null {
  const one = embed && Array.isArray(embed) ? embed[0] : embed;
  const slug = typeof one?.slug === "string" ? one.slug.trim() : "";
  const title = typeof one?.title === "string" ? one.title.trim() : "";
  if (!title) return null;
  return displayStorefrontCategoryTitle(slug, title);
}

/** Eyebrow above a homepage guide card — same slot as business category. */
export function guideTypeEyebrow(guideType: string | null | undefined): string {
  const key = guideType?.trim().toLowerCase() ?? "";
  if (!key) return "Guide";
  return GUIDE_TYPE_EYEBROW[key] ?? guideType!.replace(/_/g, " ");
}
