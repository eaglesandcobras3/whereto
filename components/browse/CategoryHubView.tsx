import Link from "next/link";
import Image from "next/image";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import type {
  CategoryBusinessRow,
  CategoryRow,
  CategoryTownGroup,
} from "@/lib/data/category-hub";
import { categoryHubIntro } from "@/lib/seo/page-intro-copy";

type Props = {
  cat: CategoryRow;
  townGroups: CategoryTownGroup[];
  businesses: CategoryBusinessRow[];
  otherCats: { title: string; slug: string }[];
};

export function CategoryHubView({ cat, townGroups, businesses, otherCats }: Props) {
  const hubPath = categoryHubPath(cat.slug);
  const townCount = townGroups.filter((g) => g.slug).length;
  const intro =
    cat.excerpt?.trim() ||
    categoryHubIntro(cat.title, businesses.length, townCount);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/categories" },
    { name: cat.title, url: hubPath },
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
            <p className="prose-editorial mt-4 max-w-3xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              {intro}
            </p>
            <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">
              {businesses.length} {businesses.length === 1 ? "listing" : "listings"} across{" "}
              {townCount} {townCount === 1 ? "town" : "towns"}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_260px]">
            <div className="space-y-14">
              {townGroups.length === 0 && (
                <p className="text-[var(--color-text-secondary)]">
                  No listings found for this category yet.
                </p>
              )}

              {townGroups.map((group) => (
                <section key={group.slug || "other"}>
                  <div className="mb-6">
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
                              <h3 className="font-headline text-base font-bold leading-snug text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
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

            <aside className="hidden lg:block">
              <div className="sticky top-8 space-y-8">
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
                            href={categoryHubPath(c.slug)}
                            className="block rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)]"
                          >
                            {c.title}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>

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
