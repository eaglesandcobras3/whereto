import { notFound, permanentRedirect } from "next/navigation";
import { getTownBySlug } from "@/lib/data/town-hub";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { resolveCategorySlugFromPublicPath } from "@/lib/data/category-hub";
import {
  PRIMARY_REGION_DB_SLUG,
  PRIMARY_REGION_HUB_PATH,
} from "@/lib/routes/primary-region";
import { redirectToSectionHub } from "@/lib/routes/section-hubs";
import type { Metadata } from "next";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { townPagePath } from "@/lib/routes/town-page-path";
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";

type Props = { params: Promise<{ townSlug: string }> };

/**
 * Legacy root catch-all: towns redirect to `/town/[slug]`.
 * Category hubs moved to `/businesses/[slug]` (308 from here when matched).
 */
export const revalidate = 21600;

export async function generateStaticParams(): Promise<{ townSlug: string }[]> {
  const { getServiceSupabase } = await import("@/lib/supabase/service-role");
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select("slug")
    .is("archived_at", null)
    .order("slug");

  const segments = new Set<string>();
  for (const row of data ?? []) {
    const slug = String((row as { slug: string }).slug);
    if (!slug || isReservedRootSlug(slug)) continue;
    segments.add(slug);
  }

  return [...segments].map((townSlug) => ({ townSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) return { title: metadataTitleSiteOnly };
  if (isReservedRootSlug(townSlug)) return { title: metadataTitleSiteOnly };
  return { title: metadataTitleSiteOnly };
}

export default async function RootCatchAllPage({ params }: Props) {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) notFound();

  const categorySlug = await resolveCategorySlugFromPublicPath(townSlug);
  if (categorySlug) {
    permanentRedirect(categoryHubPath(categorySlug));
  }

  if (isReservedRootSlug(townSlug)) notFound();

  if (townSlug === PRIMARY_REGION_DB_SLUG) {
    permanentRedirect(PRIMARY_REGION_HUB_PATH);
  }

  const town = await getTownBySlug(townSlug);
  if (town) {
    permanentRedirect(townPagePath(town.slug));
  }

  const asPlace = await getPublicPlaceBySlug(townSlug);
  if (asPlace) permanentRedirect(`/area/${townSlug}`);
  redirectToSectionHub("towns");
}
