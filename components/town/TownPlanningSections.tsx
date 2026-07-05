import type { PlacePlanningProfile } from "@/lib/data/place-planning";
import { PlaceProfileSections } from "@/components/place/PlaceProfileSections";

type Props = {
  townName: string;
  profile: PlacePlanningProfile;
};

export function TownPlanningSections({ townName, profile }: Props) {
  return (
    <PlaceProfileSections
      placeName={townName}
      profile={profile}
      profileLabel="Town profile"
      accessSectionTitle="Beach"
      nearbySectionTitle="Nearby towns"
      nearbyAnalyticsCategory="town_planning_nearby"
    />
  );
}
