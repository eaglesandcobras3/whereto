import { GuideCard } from "@/components/discovery/GuideCard";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import type { TownGuideCard } from "@/lib/data/town-hub";

type Props = {
  title: string;
  description?: string;
  guides: TownGuideCard[];
  analyticsCategory?: string;
};

/** Town/area guides grid using the same cards as the guides hub. */
export function PlaceGuidesSection({
  title,
  description,
  guides,
  analyticsCategory = "place_guides",
}: Props) {
  if (guides.length === 0) return null;

  return (
    <PlaceRelatedSection title={title} description={description} layout="grid">
      {guides.map((guide) => (
        <GuideCard
          key={guide.id}
          title={guide.title}
          slug={guide.slug}
          subtitle={guide.subtitle ?? undefined}
          imageUrl={guide.hero_image_url}
          analyticsCategory={analyticsCategory}
        />
      ))}
    </PlaceRelatedSection>
  );
}
