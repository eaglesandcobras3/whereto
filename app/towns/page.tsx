import { notFound } from "next/navigation";
import { RegionHubView } from "@/components/region/RegionHubView";
import {
  getRegionBySlug,
  getTownsInRegion,
} from "@/lib/data/town-hub";
import { PRIMARY_REGION_DB_SLUG } from "@/lib/routes/primary-region";

export const revalidate = 3600;

export default async function TownsHubPage() {
  const region = await getRegionBySlug(PRIMARY_REGION_DB_SLUG);
  if (!region) notFound();
  const towns = await getTownsInRegion(region.id);
  return <RegionHubView region={region} towns={towns} />;
}
