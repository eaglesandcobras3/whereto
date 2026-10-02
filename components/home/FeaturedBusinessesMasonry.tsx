"use client";

import type { BusinessPayload } from "@/lib/search/types";
import { HomePortraitScroll } from "@/components/home/HomePortraitScroll";
import type { HomePortraitItem } from "@/lib/home/homepage-portrait";

export type FeaturedBusiness = BusinessPayload & {
  featured_title?: string | null;
  featured_description?: string | null;
  badge?: string | null;
};

type Props = {
  businesses: FeaturedBusiness[];
  labelledBy?: string;
};

export function FeaturedBusinessesMasonry({ businesses, labelledBy }: Props) {
  if (businesses.length === 0) return null;

  const items: HomePortraitItem[] = businesses.map((b) => {
    const slug = b.slug ?? b.id;
    return {
      href: `/business/${slug}`,
      title: b.name,
      excerpt:
        b.featured_description ||
        b.ai_summary ||
        "Explore more about this local favorite.",
      imageUrl: b.hero_image_url ?? b.image_url ?? null,
      eyebrow: b.badge ?? null,
      ctaLabel: "Explore",
      analyticsCategory: "home_featured",
      analyticsLabel: slug,
    };
  });

  return <HomePortraitScroll items={items} labelledBy={labelledBy} />;
}
