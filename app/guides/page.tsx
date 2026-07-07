import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { GuidesHubClient } from "@/components/guides/GuidesHubClient";
import { hubGuidesIntro } from "@/lib/seo/page-intro-copy";
import { guidesHubMetadata } from "@/lib/seo/hub-metadata";
import {
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/seo/breadcrumb-schema";

export const revalidate = 21600;

const GUIDE_POOL_LIMIT = 100;

export const metadata: Metadata = guidesHubMetadata();

type GuideRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

function guideSubtitle(
  excerpt: string | null,
  seoDescription: string | null,
  guideType: string | null,
): string | null {
  const text = excerpt?.trim() || seoDescription?.trim();
  if (text) return text;
  if (guideType) return guideType.replace(/_/g, " ");
  return null;
}

async function getGuides(): Promise<GuideRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("guides")
    .select(
      "slug, title, excerpt, seo_description, guide_type, main_image, hero_image, main_image_url, hero_image_url",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(GUIDE_POOL_LIMIT);

  if (error) {
    console.error("guides hub: guides query", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    return {
      slug: String(r.slug),
      title: String((r as { title: string }).title),
      subtitle: guideSubtitle(
        (r.excerpt as string | null) ?? null,
        (r.seo_description as string | null) ?? null,
        (r.guide_type as string | null) ?? null,
      ),
      hero_image_url: heroUrl,
    };
  });
}

export default async function GuidesPage() {
  const allGuides = await getGuides();
  const collectionSchema = generateCollectionPageSchema({
    name: "30A Travel Guides",
    path: "/guides",
    description: hubGuidesIntro(),
  });
  const itemListSchema = generateItemListSchema(
    allGuides.map((g) => ({ name: g.title, url: `/guide/${g.slug}` })),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <GuidesHubClient allGuides={allGuides} />
    </>
  );
}
