import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";

type Props = {
  searchParams: Promise<{
    q?: string;
    town_id?: string;
    page?: string;
    type?: string;
    category?: string;
    specialty?: string;
    service_category?: string;
    tags?: string;
  }>;
};

function normalizeSearchType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  if (type === "stores") return "businesses";
  return type;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const query = sp.q?.trim();
  return {
    title: query ? `Search redirect for "${query}"` : "Search redirect",
    description: "Legacy search URLs redirect to discover or the appropriate browse hub.",
    robots: { index: false, follow: false },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const type = normalizeSearchType(sp.type);
  const specialty = sp.specialty?.trim() || sp.service_category?.trim() || undefined;

  if (type === "towns") redirect("/towns");
  if (type === "areas" || type === "access") redirect("/areas");
  if (type === "guides") redirect("/guides");
  if (type === "businesses") redirect("/businesses");
  if (type === "services" && !sp.q?.trim() && !specialty) redirect(SERVICE_VENDORS_HUB_PATH);

  redirect(
    buildDiscoverUrlFromLinkParams({
      type: type === "services" ? "services" : type === "businesses" ? "storefront" : undefined,
      town_id: sp.town_id?.trim() || undefined,
      category: sp.category?.trim() || undefined,
      service_category: specialty,
      facet: sp.tags?.trim() || undefined,
      q: sp.q?.trim() || undefined,
      page: Number(sp.page || "1"),
    }),
  );
}
