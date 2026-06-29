import Link from "next/link";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { sortBrowseBusinesses } from "@/lib/data/place-category-sections";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";
import { PlaceCategoryBusinessSections } from "@/components/discovery/PlaceCategoryBusinessSections";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import {
  PLACE_CATEGORY_SLUG_ORDER,
  type PlaceCategorySection,
} from "@/lib/data/place-category-shared";

export const revalidate = 3600;

const PREVIEW_PER_CATEGORY = 8;

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
      "Every category of local business along 30A: restaurants, coffee, bars, activities, shopping, and service businesses.",
  }),
};

async function getCategorySections(): Promise<PlaceCategorySection[]> {
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
      "id, slug, title, excerpt, ai_one_liner, ai_summary, primary_category_id, main_image, hero_image, main_image_url, hero_image_url",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .in("primary_category_id", categoryIds);

  if (bizErr) {
    console.error("categories hub: businesses query", bizErr);
    return [];
  }

  const byCategory = new Map<string, { id: string; name: string; slug: string; hero_image_url: string | null; ai_one_liner: string | null; ai_summary: string | null }[]>();
  for (const row of businessRows ?? []) {
    const r = row as Record<string, unknown>;
    const categoryId = r.primary_category_id as string | null;
    if (!categoryId) continue;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    const list = byCategory.get(categoryId) ?? [];
    list.push({
      id: String(r.id),
      name: String((r as { title: string }).title),
      slug: String(r.slug),
      hero_image_url: heroUrl,
      ai_one_liner: (r.ai_one_liner as string | null) ?? null,
      ai_summary: (r.excerpt as string | null) ?? (r.ai_summary as string | null) ?? null,
    });
    byCategory.set(categoryId, list);
  }

  const slugIndex = new Map<string, number>(PLACE_CATEGORY_SLUG_ORDER.map((s, i) => [s, i]));

  const sections: PlaceCategorySection[] = categories
    .map((cat) => {
      const pool = sortBrowseBusinesses(byCategory.get(cat.id) ?? []);
      return {
        id: cat.id,
        title: displayStorefrontCategoryTitle(cat.slug, cat.title),
        slug: cat.slug,
        businesses: pool.slice(0, PREVIEW_PER_CATEGORY),
        totalCount: pool.length,
      };
    })
    .filter((s) => s.totalCount > 0);

  sections.sort((a, b) => {
    const ai = slugIndex.get(a.slug) ?? 999;
    const bi = slugIndex.get(b.slug) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.title.localeCompare(b.title);
  });

  return sections;
}

export default async function CategoriesPage() {
  const sections = await getCategorySections();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <BrowseHubHero
          title="Browse by category"
          description="Every type of business along Scenic 30A in South Walton, Florida, from restaurants and coffee shops to activities, shopping, and service businesses."
          collapsibleDescription="Pick a category to browse listings grouped by town, or open a town guide first when you are still deciding where to stay along the corridor."
        />

        <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16 md:px-10">
          <PlaceCategoryBusinessSections
            placeName="30A"
            placeSlug="categories"
            sections={sections}
            analyticsCategoryPrefix="categories_hub"
            heading="All categories"
            subheading="Browse by category. Tap a section to expand."
            defaultExpandedCount={4}
          />
        </section>

        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
              Looking for something specific?
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Use search to find businesses by name, vibe, or natural language. &quot;Casual
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
