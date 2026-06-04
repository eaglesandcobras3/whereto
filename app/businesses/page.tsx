import Link from "next/link";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  applyFeaturedListingPoolFilters,
  filterFeaturedListingPool,
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { pickDailySubset } from "@/lib/home/daily-featured-pick";
import type { BusinessPayload } from "@/lib/search/types";
import { FeaturedBusinessesMasonry } from "@/components/home/FeaturedBusinessesMasonry";
import { BusinessesHubSearch } from "@/components/BusinessesHubSearch";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { TownCard } from "@/components/discovery/TownCard";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";

export const revalidate = 3600;

const DAILY_FEATURED_LIMIT = 8;
const BUSINESS_POOL_LIMIT = 150;
const BUSINESS_INDEX_LIMIT = 1000;

type BusinessIndexLink = { name: string; slug: string };

export const metadata: Metadata = {
  ...canonicalAlternates("/businesses"),
  title: "Local Businesses on 30A, Florida | Restaurants, Shops & More",
  description:
    "Browse local businesses along Scenic 30A in South Walton, Florida — restaurants, coffee shops, bars, activities, shopping boutiques, and services across Rosemary Beach, Seaside, Watercolor, Alys Beach, and Inlet Beach.",
  keywords: [
    "30A local businesses",
    "30A restaurants",
    "30A shops",
    "South Walton businesses",
    "Emerald Coast local",
    "30A Florida directory",
    "things to do 30A",
    "where to eat 30A",
  ],
  ...openGraphForPage({
    path: "/businesses",
    title: "Local Businesses on 30A, Florida | WhereTo30A",
    description:
      "The local business directory for Scenic 30A — restaurants, coffee, bars, activities, shopping, and services curated town by town.",
  }),
};

const CATEGORY_ICONS: Record<string, string> = {
  restaurants: "restaurant",
  coffee_shops: "coffee",
  bars: "local_bar",
  activities: "kayaking",
  shopping: "shopping_bag",
  services: "home_repair_service",
};

type CategoryRow = { title: string; slug: string };
type TownRow = {
  name: string;
  slug: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

async function getCategories(): Promise<CategoryRow[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("business_categories")
    .select("title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title");
  return (data ?? []) as CategoryRow[];
}

async function getDailyFeaturedBusinesses(): Promise<BusinessPayload[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await applyFeaturedListingPoolFilters(
    supabase
      .from("businesses_view")
      .select("id, title, slug, excerpt, main_image, hero_image, main_image_url, hero_image_url, content")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN),
  )
    .order("sort", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .order("id", { ascending: true })
    .limit(BUSINESS_POOL_LIMIT);

  if (error) {
    console.error("businesses hub: businesses query", error);
    return [];
  }

  const dailyPicks = pickDailySubset(filterFeaturedListingPool(data ?? []), DAILY_FEATURED_LIMIT);

  return dailyPicks.map((row) => {
    const r = row as {
      id: string;
      title: string;
      slug: string;
      excerpt?: string | null;
      main_image?: string | null;
      hero_image?: string | null;
      main_image_url?: string | null;
      hero_image_url?: string | null;
      content?: string | null;
    };
    const img = getPublicImageUrlWithView(
      r.main_image_url,
      r.hero_image_url,
      r.main_image,
      r.hero_image,
    );
    return {
      id: r.id,
      name: r.title,
      slug: r.slug,
      ai_summary: r.excerpt ?? r.content?.slice(0, 500) ?? null,
      hero_image_url: img,
      image_url: img,
    };
  });
}

async function getAllBusinessIndexLinks(): Promise<BusinessIndexLink[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("businesses_view")
    .select("title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title", { ascending: true })
    .limit(BUSINESS_INDEX_LIMIT);

  if (error) {
    console.error("businesses hub: index query", error);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const r = row as { title: string; slug: string };
      return { name: r.title, slug: r.slug };
    })
    .filter((b) => b.slug);
}

async function getTowns(): Promise<TownRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns_view")
    .select("id, title, slug, excerpt, main_image, hero_image, main_image_url, hero_image_url")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title", { ascending: true });

  if (error) {
    console.error("businesses hub: towns query", error);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const heroUrl = getPublicImageUrlWithView(
        r.main_image_url as string | null,
        r.hero_image_url as string | null,
        r.main_image as string | null,
        r.hero_image as string | null,
      );
      return {
        name: String((r as { title: string }).title),
        slug: String(r.slug),
        subtitle: (r.excerpt as string | null) ?? null,
        hero_image_url: heroUrl,
      };
    })
    .filter((t) => t.slug && !isReservedRootSlug(t.slug));
}

export default async function BusinessesPage() {
  const featureFlags = await getAllFeatureFlags();
  const [categories, featuredBusinesses, towns, businessIndex] = await Promise.all([
    getCategories(),
    getDailyFeaturedBusinesses(),
    getTowns(),
    getAllBusinessIndexLinks(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero with search */}
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <header className="space-y-4 text-center">
            <p className="text-eyebrow">30A · South Walton, Florida</p>
            <h1 className="text-hero text-[var(--color-text-primary)]">
              Local businesses on 30A
            </h1>
            <p className="mx-auto max-w-xl text-lg text-[var(--color-text-secondary)]">
              Restaurants, coffee shops, bars, boutiques, and services across every community
              along Scenic 30A — search by name or describe what you&apos;re looking for.
            </p>
            <div className="mx-auto max-w-2xl pt-2">
              <BusinessesHubSearch featureFlags={featureFlags} />
            </div>
          </header>
        </div>
      </div>

      {/* Daily featured picks */}
      {featuredBusinesses.length > 0 && (
        <section className="border-b border-[var(--color-border)] bg-[var(--color-background)] py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 md:mb-12">
              <p className="text-eyebrow mb-3">Editor&apos;s picks</p>
              <h2 className="font-headline text-3xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-4xl">
                Featured today
              </h2>
            </div>
            <FeaturedBusinessesMasonry businesses={featuredBusinesses} />
          </div>
        </section>
      )}

      {/* Browse by category */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="font-headline mb-8 text-2xl font-bold text-[var(--color-text-primary)]">
            Browse by category
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const icon = CATEGORY_ICONS[cat.slug] ?? "storefront";
              return (
                <Link
                  key={cat.slug}
                  href={categoryHubPath(cat.slug)}
                  className="group flex items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
                    <span className="material-symbols-outlined !text-xl">{icon}</span>
                  </span>
                  <span className="font-headline text-sm font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                    {cat.title}
                  </span>
                  <span className="material-symbols-outlined ml-auto !text-sm text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Browse by town */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14">
        <div className="mx-auto max-w-6xl px-4">
          <header className="mb-8 space-y-2">
            <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
              Browse by town
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Every 30A community has its own character — find restaurants, shops, and local guides
              for each one.
            </p>
          </header>
          {towns.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)]">No towns found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {towns.map((town) => (
                <TownCard
                  key={town.slug}
                  name={town.name}
                  slug={town.slug}
                  subtitle={town.subtitle ?? getTownDescriptor(town.slug)}
                  imageUrl={town.hero_image_url}
                  analyticsCategory="businesses_hub"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {businessIndex.length > 0 ? (
        <section className="border-t border-[var(--color-border)] py-14">
          <div className="mx-auto max-w-6xl px-4">
            <header className="mb-8 space-y-2">
              <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                All business listings
              </h2>
              <p className="text-[var(--color-text-secondary)]">
                Every published business on WhereTo30A — {businessIndex.length}{" "}
                {businessIndex.length === 1 ? "listing" : "listings"}.
              </p>
            </header>
            <nav aria-label="All business listings">
              <ul className="columns-1 gap-x-8 sm:columns-2 lg:columns-3 xl:columns-4">
                {businessIndex.map((b) => (
                  <li key={b.slug} className="mb-2 break-inside-avoid">
                    <Link
                      href={`/business/${b.slug}`}
                      className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                    >
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      ) : null}
    </div>
  );
}
