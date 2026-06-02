import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase, getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { getSiteUrl } from "@/lib/site-url";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { sortBrowseBusinesses } from "@/lib/data/place-category-sections";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

type CategoryRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
};

type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  excerpt: string | null;
  hero_image_url: string | null;
  featured: boolean;
  price_level: number | null;
  town_id: string | null;
  town_name: string | null;
  town_slug: string | null;
};

type TownGroup = {
  name: string;
  slug: string;
  townId: string | null;
  businesses: BusinessRow[];
  totalCount: number;
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const supabase = getServiceSupabaseOrNull();
    if (!supabase) return [];
    const { data } = await supabase
      .from("business_categories")
      .select("slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN);
    return (data ?? [])
      .map((r) => ({ slug: String((r as { slug: string }).slug) }))
      .filter((r) => r.slug);
  } catch {
    return [];
  }
}

async function loadCategory(slug: string): Promise<CategoryRow | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("business_categories")
    .select("id, title, slug, excerpt")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const r = data as { id: string; title: string; slug: string; excerpt: string | null };
  return r;
}

async function loadBusinessesForCategory(categoryId: string): Promise<BusinessRow[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("businesses_view")
    .select(
      "id, slug, title, excerpt, main_image, hero_image, main_image_url, hero_image_url, featured, price_level, towns ( id, title, slug )",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .eq("primary_category_id", categoryId)
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(500);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const town = r.towns as { id?: string; title?: string; slug?: string } | null;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    return {
      id: String(r.id),
      slug: String(r.slug),
      name: String((r as { title: string }).title),
      excerpt: (r.excerpt as string | null) ?? null,
      hero_image_url: heroUrl,
      featured: Boolean(r.featured),
      price_level: (r.price_level as number | null) ?? null,
      town_id: town?.id ?? null,
      town_name: town?.title ?? null,
      town_slug: town?.slug ?? null,
    };
  });
}

function groupByTown(businesses: BusinessRow[]): TownGroup[] {
  const map = new Map<string, { name: string; slug: string; townId: string | null; pool: BusinessRow[] }>();
  const noTown: BusinessRow[] = [];

  for (const b of businesses) {
    if (!b.town_slug || !b.town_name) {
      noTown.push(b);
      continue;
    }
    if (!map.has(b.town_slug)) {
      map.set(b.town_slug, {
        name: b.town_name,
        slug: b.town_slug,
        townId: b.town_id,
        pool: [],
      });
    }
    map.get(b.town_slug)!.pool.push(b);
  }

  const groups: TownGroup[] = [...map.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => {
      const sorted = sortBrowseBusinesses(g.pool);
      return {
        name: g.name,
        slug: g.slug,
        townId: g.townId,
        businesses: sorted,
        totalCount: sorted.length,
      };
    });

  if (noTown.length > 0) {
    const sorted = sortBrowseBusinesses(noTown);
    groups.push({
      name: "Other",
      slug: "",
      townId: null,
      businesses: sorted,
      totalCount: sorted.length,
    });
  }
  return groups;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await loadCategory(slug);
  if (!cat) return { title: "Category" };

  const title = `${cat.title} on 30A, Florida`;
  const description =
    cat.excerpt?.trim() ||
    `Find the best ${cat.title.toLowerCase()} along Scenic 30A in South Walton, Florida — browse local options across Rosemary Beach, Seaside, Watercolor, Alys Beach, Inlet Beach, and more.`;

  const ogTitle = `${cat.title} on 30A | WhereTo30A`;

  return {
    ...canonicalAlternates(`/categories/${slug}`),
    title,
    description,
    keywords: [
      `${cat.title.toLowerCase()} 30A`,
      `${cat.title.toLowerCase()} South Walton`,
      `best ${cat.title.toLowerCase()} 30A Florida`,
      `${cat.title.toLowerCase()} Rosemary Beach`,
      `${cat.title.toLowerCase()} Seaside Florida`,
      `30A ${cat.title.toLowerCase()}`,
    ],
    ...openGraphForPage({
      path: `/categories/${slug}`,
      title: ogTitle,
      description,
    }),
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [cat, otherCats] = await Promise.all([
    loadCategory(slug),
    getServiceSupabase()
      .from("business_categories")
      .select("title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .then((r) => (r.data ?? []) as { title: string; slug: string }[]),
  ]);

  if (!cat) notFound();

  const businesses = await loadBusinessesForCategory(cat.id);
  const townGroups = groupByTown(businesses);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/categories" },
    { name: cat.title, url: `/categories/${slug}` },
  ]);

  const itemListSchema = {
    ...generateItemListSchema(
      businesses.slice(0, 50).map((b) => ({
        name: b.name,
        url: `/business/${b.slug}`,
      })),
    ),
    name: `${cat.title} on 30A, Florida`,
    description: `Local ${cat.title.toLowerCase()} along Scenic 30A in South Walton, Florida`,
    numberOfItems: businesses.length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="mb-5 flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
              <Link href="/" className="transition-colors hover:text-[var(--color-primary)]">
                Home
              </Link>
              <span>/</span>
              <Link href="/categories" className="transition-colors hover:text-[var(--color-primary)]">
                Categories
              </Link>
              <span>/</span>
              <span className="text-[var(--color-text-primary)]">{cat.title}</span>
            </nav>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
              {cat.title} on 30A
            </h1>
            {cat.excerpt && (
              <p className="mt-4 max-w-2xl text-lg text-[var(--color-text-secondary)]">
                {cat.excerpt}
              </p>
            )}
            <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">
              {businesses.length} {businesses.length === 1 ? "listing" : "listings"} across{" "}
              {townGroups.filter((g) => g.slug).length} towns
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_260px]">
            {/* Main: businesses grouped by town */}
            <div className="space-y-14">
              {townGroups.length === 0 && (
                <p className="text-[var(--color-text-secondary)]">
                  No listings found for this category yet.
                </p>
              )}

              {townGroups.map((group) => (
                <section key={group.slug || "other"}>
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                      {group.slug ? (
                        <Link
                          href={`/${group.slug}`}
                          className="transition-colors hover:text-[var(--color-primary)]"
                        >
                          {group.name}
                        </Link>
                      ) : (
                        group.name
                      )}
                    </h2>
                    {group.slug ? (
                      <Link
                        href={`/${group.slug}`}
                        {...gaClickProps({
                          event: "nav_click",
                          category: "category_page_town_guide",
                          label: `${cat.slug}_${group.slug}`,
                        })}
                        className="shrink-0 text-xs font-medium text-[var(--color-primary)] hover:underline"
                      >
                        Town guide
                      </Link>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {group.businesses.map((b) => {
                      const thumb = businessListingImageUrl(b.hero_image_url);
                      return (
                        <Link
                          key={b.id}
                          href={`/business/${b.slug}`}
                          {...gaClickProps({
                            event: "nav_click",
                            category: "category_page_business",
                            label: b.slug,
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
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              />
                            </div>
                          ) : (
                            <div className="flex aspect-[3/2] items-center justify-center bg-[var(--color-surface-container-high)] text-[var(--color-text-tertiary)]">
                              <span className="material-symbols-outlined !text-4xl">storefront</span>
                            </div>
                          )}
                          <div className="flex flex-1 flex-col p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-headline text-base font-bold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                                {b.name}
                              </h3>
                              {b.price_level != null && (
                                <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">
                                  {"$".repeat(b.price_level)}
                                </span>
                              )}
                            </div>
                            {b.excerpt && (
                              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                                {b.excerpt}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-8 space-y-8">
                {/* Other categories */}
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                    Other categories
                  </h3>
                  <ul className="space-y-1">
                    {otherCats
                      .filter((c) => c.slug !== cat.slug)
                      .map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/categories/${c.slug}`}
                            className="block rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)]"
                          >
                            {c.title}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Towns with this category */}
                {townGroups.filter((g) => g.slug).length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                      Browse by town
                    </h3>
                    <ul className="space-y-1">
                      {townGroups
                        .filter((g) => g.slug)
                        .map((g) => (
                          <li key={g.slug}>
                            <Link
                              href={`/${g.slug}`}
                              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)]"
                            >
                              <span>{g.name}</span>
                              <span className="text-xs text-[var(--color-text-tertiary)]">
                                {g.totalCount}
                              </span>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
