import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { loadCategory } from "@/lib/data/category-hub";
import { buildCategoryHubMetadata } from "@/lib/data/category-hub";
import {
  businessBrowseGroupFromPublicSegment,
  businessBrowseGroupPublicSegment,
} from "@/lib/business-categories/browse-group-nav";
import { BUSINESS_CATEGORY_GROUP_SLUGS } from "@/lib/business-categories/groups";
import {
  buildBrowseGroupHubMetadata,
  loadBrowseGroupHubPage,
} from "@/lib/data/browse-group-hub";
import { BrowseGroupHubView } from "@/components/browse/BrowseGroupHubView";
import {
  listUnifiedRollupOrder,
  unifiedRollupFromPublicSegment,
  unifiedRollupPublicSegment,
} from "@/lib/categories/unified-browse";

export const revalidate = 21600;

type Props = { params: Promise<{ slug: string }> };

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw } = await params;
  const rollupSlug = unifiedRollupFromPublicSegment(raw);
  if (rollupSlug) return buildBrowseGroupHubMetadata(rollupSlug);

  const groupSlug = businessBrowseGroupFromPublicSegment(raw);
  if (groupSlug) return buildBrowseGroupHubMetadata(groupSlug);

  const slug = normalizeBusinessCategorySlug(raw) ?? raw.trim().toLowerCase();
  if (!slug) return { title: "Category" };
  const cat = await loadCategory(slug);
  if (!cat) return { title: "Category" };
  return buildCategoryHubMetadata(slug);
}

export default async function CategoryOrBrowseGroupPage({ params }: Props) {
  const { slug: raw } = await params;

  const rollupSlug = unifiedRollupFromPublicSegment(raw);
  if (rollupSlug) {
    const hub = await loadBrowseGroupHubPage(rollupSlug, "all");
    if (!hub) notFound();
    return <BrowseGroupHubView hub={hub} />;
  }

  const groupSlug = businessBrowseGroupFromPublicSegment(raw);
  if (groupSlug) {
    const hub = await loadBrowseGroupHubPage(groupSlug, "all");
    if (!hub) notFound();
    return <BrowseGroupHubView hub={hub} />;
  }

  const slug = normalizeBusinessCategorySlug(raw) ?? raw.trim().toLowerCase();
  if (!slug) notFound();
  const cat = await loadCategory(slug);
  if (!cat) notFound();
  permanentRedirect(categoryHubPath(cat.slug));
}
