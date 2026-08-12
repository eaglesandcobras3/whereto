import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { loadCategory } from "@/lib/data/category-hub";
import {
  businessBrowseGroupFromPublicSegment,
  businessBrowseGroupHubPath,
  businessBrowseGroupPublicSegment,
} from "@/lib/business-categories/browse-group-nav";
import { BUSINESS_CATEGORY_GROUP_SLUGS } from "@/lib/business-categories/groups";
import {
  listUnifiedRollupOrder,
  unifiedRollupFromPublicSegment,
  unifiedRollupHubPath,
  unifiedRollupPublicSegment,
} from "@/lib/categories/unified-browse";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";

export const revalidate = 21600;

type Props = { params: Promise<{ slug: string }> };

/** Keep old `/categories/[slug]` URLs generating so redirects stay warm. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const legacy = BUSINESS_CATEGORY_GROUP_SLUGS.map((slug) => ({
    slug: businessBrowseGroupPublicSegment(slug),
  }));
  const rollups = listUnifiedRollupOrder().map((slug) => ({
    slug: unifiedRollupPublicSegment(slug),
  }));
  const seen = new Set<string>();
  const out: { slug: string }[] = [];
  for (const item of [...rollups, ...legacy]) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: true } };
}

/** Legacy `/categories/[slug]` → `/businesses/[slug]` (308). */
export default async function LegacyCategoriesRedirectPage({ params }: Props) {
  const { slug: raw } = await params;
  const segment = normalizeUrlSegment(raw) || raw.trim().toLowerCase();
  if (!segment) permanentRedirect("/businesses");

  const rollupSlug = unifiedRollupFromPublicSegment(segment);
  if (rollupSlug) permanentRedirect(unifiedRollupHubPath(rollupSlug));

  const groupSlug = businessBrowseGroupFromPublicSegment(segment);
  if (groupSlug) permanentRedirect(businessBrowseGroupHubPath(groupSlug));

  const slug = normalizeBusinessCategorySlug(segment) ?? segment;
  const cat = await loadCategory(slug);
  if (cat) permanentRedirect(categoryHubPath(cat.slug));

  permanentRedirect(`/businesses/${segment}`);
}
