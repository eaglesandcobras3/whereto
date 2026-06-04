import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { sortBrowseBusinesses } from "@/lib/data/place-category-sections";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";

export const revalidate = 3600;

const PREVIEW_PER_CATEGORY = 4;

export const metadata: Metadata = {
  ...canonicalAlternates("/categories"),
  title: "Browse by Category | Restaurants, Coffee, Bars & More on 30A",
  description:
    "Find the best restaurants, coffee shops, bars, activities, shopping, and service businesses along Scenic 30A in South Walton, Florida. Browse every category of local business.",
  keywords: [
    "30A restaurants",
    "30A coffee shops",
    "30A bars",
    "things to do 30A",
    "30A shopping",
    "30A activities",
    "South Walton businesses",
    "Emerald Coast dining",
  ],
  ...openGraphForPage({
    path: "/categories",
    title: "Browse by Category | 30A Local Businesses | WhereTo30A",
    description:
      "Every category of local business along 30A — restaurants, coffee, bars, activities, shopping, and service businesses.",
  }),
};

const CATEGORY_ICONS: Record<string, string> = {
  restaurants: "restaurant",
  coffee_shops: "coffee",
  bars: "local_bar",
  activities: "kayaking",
  shopping: "shopping_bag",
  services: "home_repair_service",
  events: "event",
  beaches: "beach_access",
};

type PreviewBusiness = {
  id: string;
  slug: string;
  name: string;
  excerpt: string | null;
  hero_image_url: string | null;
  town_name: string | null;
};

type CategorySection = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  business_count: number;
  preview: PreviewBusiness[];
  allBusinesses: PreviewBusiness[];
};

function mapBusinessRow(row: Record<string, unknown>): PreviewBusiness {
  const town = row.towns as { title?: string } | null;
  const heroUrl = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String((row as { title: string }).title),
    excerpt: (row.excerpt as string | null) ?? null,
    hero_image_url: heroUrl,
    town_name: town?.title ?? null,
  };
}

async function getCategorySections(): Promise<CategorySection[]> {
  const supabase = getServiceSupabase();

  const { data: cats, error: catErr } = await supabase
    .from("business_categories")
    .select("id, title, slug, excerpt")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title");

  if (catErr) {
    console.error("categories hub: categories query", catErr);
    return [];
  }

  const categories = (cats ?? []) as {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
  }[];

  if (categories.length === 0) return [];

  const categoryIds = categories.map((c) => c.id);

  const { data: businessRows, error: bizErr } = await supabase
    .from("businesses_view")
    .select(
      "id, slug, title, excerpt, primary_category_id, main_image, hero_image, main_image_url, hero_image_url, towns ( title )",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .in("primary_category_id", categoryIds);

  if (bizErr) {
    console.error("categories hub: businesses query", bizErr);
    return [];
  }

  const byCategory = new Map<string, PreviewBusiness[]>();
  for (const row of businessRows ?? []) {
    const r = row as Record<string, unknown>;
    const categoryId = r.primary_category_id as string | null;
    if (!categoryId) continue;
    const list = byCategory.get(categoryId) ?? [];
    list.push(mapBusinessRow(r));
    byCategory.set(categoryId, list);
  }

  return categories
    .map((cat) => {
      const pool = sortBrowseBusinesses(byCategory.get(cat.id) ?? []);
      return {
        ...cat,
        title: displayStorefrontCategoryTitle(cat.slug, cat.title),
        business_count: pool.length,
        preview: pool.slice(0, PREVIEW_PER_CATEGORY),
        allBusinesses: pool,
      };
    })
    .filter((cat) => cat.business_count > 0);
}

export default async function CategoriesPage() {
  const sections = await getCategorySections();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14 md:py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <span className="mb-4 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Browse 30A
            </span>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
              Browse by category
            </h1>
            <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
              Every type of business along Scenic 30A in South Walton, Florida —
              from restaurants and coffee shops to activities, shopping, and service businesses.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          {sections.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)]">No categories found.</p>
          ) : (
            <div className="space-y-16 md:space-y-20">
              {sections.map((cat) => {
                const icon = CATEGORY_ICONS[cat.slug] ?? "storefront";
                return (
                  <section key={cat.slug} aria-labelledby={`category-${cat.slug}`}>
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
                          <span className="material-symbols-outlined text-2xl">{icon}</span>
                        </span>
                        <div className="min-w-0">
                          <h2
                            id={`category-${cat.slug}`}
                            className="font-headline text-2xl font-bold text-[var(--color-text-primary)]"
                          >
                            {cat.title}
                          </h2>
                          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
                            {cat.business_count}{" "}
                            {cat.business_count === 1 ? "listing" : "listings"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={categoryHubPath(cat.slug)}
                        {...gaClickProps({
                          event: "nav_click",
                          category: "categories_hub",
                          label: `view_more_${cat.slug}`,
                        })}
                        className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-light)]"
                      >
                        View more
                        <span className="material-symbols-outlined !text-base transition-transform group-hover:translate-x-0.5">
                          arrow_forward
                        </span>
                      </Link>
                    </div>

                    {cat.excerpt ? (
                      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-secondary)]">
                        {cat.excerpt}
                      </p>
                    ) : null}

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {cat.preview.map((b) => {
                        const thumb = businessListingImageUrl(b.hero_image_url);
                        return (
                          <Link
                            key={b.id}
                            href={`/business/${b.slug}`}
                            {...gaClickProps({
                              event: "nav_click",
                              category: "categories_hub_preview",
                              label: `${cat.slug}_${b.slug}`,
                            })}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:shadow-md"
                          >
                            {thumb ? (
                              <div className="relative aspect-[3/2] overflow-hidden">
                                <Image
                                  src={thumb}
                                  alt={b.name}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  sizes="(max-width: 1024px) 50vw, 25vw"
                                />
                              </div>
                            ) : (
                              <div className="flex aspect-[3/2] items-center justify-center bg-[var(--color-surface-container-high)] text-[var(--color-text-tertiary)]">
                                <span className="material-symbols-outlined !text-4xl">storefront</span>
                              </div>
                            )}
                            <div className="flex flex-1 flex-col p-3 sm:p-4">
                              <h3 className="font-headline text-sm font-bold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors sm:text-base">
                                {b.name}
                              </h3>
                              {b.town_name ? (
                                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                                  {b.town_name}
                                </p>
                              ) : null}
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    <nav
                      aria-label={`All ${cat.title} listings`}
                      className="mt-8 border-t border-[var(--color-border)] pt-6"
                    >
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                        All {cat.title.toLowerCase()} listings
                      </h3>
                      <ul className="columns-1 gap-x-8 sm:columns-2 lg:columns-3">
                        {cat.allBusinesses.map((b) => (
                          <li key={b.id} className="mb-2 break-inside-avoid">
                            <Link
                              href={`/business/${b.slug}`}
                              {...gaClickProps({
                                event: "nav_click",
                                category: "categories_hub_index",
                                label: `${cat.slug}_${b.slug}`,
                              })}
                              className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                            >
                              {b.name}
                              {b.town_name ? (
                                <span className="text-[var(--color-text-tertiary)]">
                                  {" "}
                                  · {b.town_name}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
              Looking for something specific?
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Use search to find businesses by name, vibe, or natural language — &quot;casual
              dinner after the beach&quot; works.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
            >
              <span className="material-symbols-outlined !text-base">search</span>
              Search 30A
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
