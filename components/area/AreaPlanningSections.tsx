import type { PlacePlanningProfile } from "@/lib/data/place-planning";
import { PlaceProfileSections } from "@/components/place/PlaceProfileSections";

type Props = {
  areaName: string;
  profile: PlacePlanningProfile;
};

export function AreaPlanningSections({ areaName, profile }: Props) {
  return (
    <PlaceProfileSections
      placeName={areaName}
      profile={profile}
      profileLabel="Area profile"
      accessSectionTitle="Getting here"
      nearbySectionTitle="Nearby spots"
      nearbyAnalyticsCategory="area_planning_nearby"
    />
  );
}
