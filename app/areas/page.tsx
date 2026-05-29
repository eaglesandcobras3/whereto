import Link from "next/link";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { AreaCard } from "@/components/discovery/AreaCard";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export const revalidate = 3600;

export const metadata: Metadata = {
  ...canonicalAlternates("/areas"),
  title: "30A Shopping Districts & Town Centers | Areas Guide",
  description:
    "Explore the town centers, shopping districts, and local gathering spots along Scenic 30A — from Rosemary Beach Town Center and Seaside to Alys Beach and WaterColor's MarketShops.",
  keywords: [
    "30A town centers",
    "30A shopping districts",
    "Rosemary Beach Town Center",
    "Seaside Florida shops",
    "Alys Beach town center",
    "30A local areas",
    "South Walton districts",
    "30A landmarks",
  ],
  openGraph: {
    title: "30A Shopping Districts & Town Centers | WhereTo30A",
    description:
      "Every notable area, district, and gathering spot along 30A — curated with local restaurants, shops, and things to do nearby.",
    type: "website",
  },
};

const AREA_TYPE_LABELS: Record<string, string> = {
  shopping_district: "Shopping district",
  town_center: "Town center",
  neighborhood: "Neighborhood",
  landmark: "Landmark",
  waterfront: "Waterfront",
  market: "Market",
};

type AreaRow = {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

function areaSubtitle(
  excerpt: string | null,
  areaType: string | null,
  townName: string | null,
): string | null {
  if (excerpt?.trim()) return excerpt.trim();
  const typeLabel = areaType
    ? (AREA_TYPE_LABELS[areaType] ?? areaType.replace(/_/g, " "))
    : null;
  if (typeLabel && townName) return `${typeLabel} · ${townName}`;
  return typeLabel ?? townName;
}

async function getAreas(): Promise<AreaRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("areas_view")
    .select(
      "id, title, slug, area_type, excerpt, main_image, hero_image, main_image_url, hero_image_url, towns ( title, slug )",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title");

  if (error) {
    console.error("areas hub: areas query", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const town = r.towns as { title?: string } | null;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    return {
      id: String(r.id),
      name: String((r as { title: string }).title),
      slug: String(r.slug),
      subtitle: areaSubtitle(
        (r.excerpt as string | null) ?? null,
        (r.area_type as string | null) ?? null,
        town?.title ?? null,
      ),
      hero_image_url: heroUrl,
    };
  });
}

export default async function AreasPage() {
  const areas = await getAreas();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero — matches /towns */}
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <header className="space-y-4 text-center">
            <p className="text-eyebrow">30A · South Walton, Florida</p>
            <h1 className="text-hero text-[var(--color-text-primary)]">
              Districts &amp; town centers
            </h1>
            <p className="mx-auto max-w-xl text-lg text-[var(--color-text-secondary)]">
              The shopping districts, town centers, and local gathering spots that give each
              30A community its character.
            </p>
          </header>
        </div>
      </div>

      {/* Area grid */}
      <div className="mx-auto max-w-6xl px-4 py-12">
        {areas.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)]">No areas found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <AreaCard
                key={area.slug}
                name={area.name}
                slug={area.slug}
                subtitle={area.subtitle ?? undefined}
                imageUrl={area.hero_image_url}
                analyticsCategory="areas_hub"
              />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
            Explore by town
          </h2>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            Every 30A community has its own character — find restaurants, shops, and local guides
            for each one.
          </p>
          <Link
            href="/towns"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
          >
            <span className="material-symbols-outlined !text-base">beach_access</span>
            Browse all towns
          </Link>
        </div>
      </section>
    </div>
  );
}
