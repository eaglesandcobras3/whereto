"use client";

import type { BusinessPayload } from "@/lib/search/types";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";

export type FeaturedBusiness = BusinessPayload & {
  featured_title?: string | null;
  featured_description?: string | null;
  badge?: string | null;
};

type Props = {
  businesses: FeaturedBusiness[];
};

export function FeaturedBusinessesMasonry({ businesses }: Props) {
  if (businesses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
      {businesses.map((b) => {
        const slug = b.slug ?? b.id;
        return (
          <BusinessPreviewCard
            key={b.id}
            name={b.name}
            slug={slug}
            excerpt={
              b.featured_description ||
              b.ai_summary ||
              "Explore more about this local favorite."
            }
            heroImageUrl={b.hero_image_url}
            badge={b.badge}
            analyticsCategory="businesses_hub_featured"
            analyticsLabel={slug}
          />
        );
      })}
    </div>
  );
}
