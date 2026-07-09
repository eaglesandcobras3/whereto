import type { PlacePlanningProfile } from "@/lib/data/place-planning";
import { PlaceProfileSections } from "@/components/place/PlaceProfileSections";

type Props = {
  townName: string;
  townSlug: string;
  profile: PlacePlanningProfile;
};

export function TownPlanningSections({ townName, townSlug, profile }: Props) {
  return (
    <PlaceProfileSections
      placeName={townName}
      placeSlug={townSlug}
      profile={profile}
      profileLabel="Town profile"
      accessSectionTitle="Beach"
      nearbySectionTitle="Nearby towns"
      nearbyAnalyticsCategory="town_planning_nearby"
    />
  );
}
