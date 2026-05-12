import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RegionHubView } from "@/components/region/RegionHubView";
import {
  getRegionBySlug,
  getTownsInRegion,
} from "@/lib/data/town-hub";
import { PRIMARY_REGION_DB_SLUG } from "@/lib/routes/primary-region";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";

export const revalidate = 3600;

export const metadata: Metadata = {
  ...canonicalAlternates("/towns"),
  title: "Beach towns",
  description: "Explore beach towns along 30A and the Emerald Coast.",
};

export default async function TownsHubPage() {
  const region = await getRegionBySlug(PRIMARY_REGION_DB_SLUG);
  if (!region) notFound();
  const towns = await getTownsInRegion(region.id);
  return <RegionHubView region={region} towns={towns} />;
}
