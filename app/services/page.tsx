import Link from "next/link";
import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { getServiceVendorsPage } from "@/lib/data/service-vendors-hub";
import {
  ServiceSpecialtyBrowse,
  toServiceSpecialtyBrowseGroups,
} from "@/components/services/ServiceSpecialtyBrowse";
import {
  findGroupForSpecialtySlug,
  groupListedServiceCategories,
} from "@/lib/service-categories/group-listed-categories";
import {
  parseSpecialtySlugsFromParams,
  SERVICE_VENDOR_UI,
} from "@/lib/routes/service-vendor-labels";
import {
  SERVICE_VENDORS_HUB_PATH,
  serviceVendorsHubHref,
  serviceVendorsSearchHref,
} from "@/lib/routes/service-vendors-hub";
import { discoveryHref } from "@/lib/nav/discovery-links";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{
    specialty?: string;
    service_category?: string;
    page?: string;
    q?: string;
  }>;
};

export const metadata: Metadata = {
  ...canonicalAlternates(SERVICE_VENDORS_HUB_PATH),
  title: "Service Providers on 30A, Florida | Contractors, Vendors & Trades",
  description:
    "Find regional service providers along Scenic 30A and South Walton — landscaping, cleaning, contractors, trades, and mobile vendors who work across the corridor.",
  keywords: [
    "30A service providers",
    "30A contractors",
    "South Walton vendors",
    "30A landscaping",
    "handyman 30A Florida",
    "mobile services 30A",
  ],
  ...openGraphForPage({
    path: SERVICE_VENDORS_HUB_PATH,
    title: "Service Providers on 30A | WhereTo30A",
    description:
      "Regional and mobile service providers for 30A — browse by specialty, then filter by town in search.",
  }),
};

function paginationHref(page: number, specialty: string | null, query: string): string {
  return serviceVendorsHubHref({
    specialtySlug: specialty,
    page: page > 1 ? page : undefined,
    query: query || null,
  });
}

export default async function ServiceVendorsHubPage({ searchParams }: Props) {
  const sp = await searchParams;
  const specialtySlugs = parseSpecialtySlugsFromParams((key) => {
    if (key === "specialty") return sp.specialty;
    if (key === "service_category") return sp.service_category;
    return null;
  });
  const specialtySlug = specialtySlugs[0] ?? null;
  const page = Math.max(1, Number(sp.page) || 1);
  const query = sp.q?.trim() ?? "";

  const featureFlags = await getAllFeatureFlags();
  const result = await getServiceVendorsPage({ page, specialtySlug, query });
  const { vendors, totalCount, totalPages, categories, activeCategory } = result;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Services", url: SERVICE_VENDORS_HUB_PATH },
  ]);

  const listedSpecialties = categories.filter((c) => c.vendor_count > 0);
  const specialtyGroups = groupListedServiceCategories(listedSpecialties);
  const openGroupSlug = findGroupForSpecialtySlug(specialtyGroups, specialtySlug);
  const browseGroups = toServiceSpecialtyBrowseGroups(specialtyGroups, specialtySlug);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="flex-1">
        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="mb-5 flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
              <Link href="/" className="transition-colors hover:text-[var(--color-primary)]">
                Home
              </Link>
              <span>/</span>
              <span className="text-[var(--color-text-primary)]">Services</span>
            </nav>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
              Service providers on 30A
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[var(--color-text-secondary)]">
              Regional and mobile vendors — trades, insurance, legal, medical, marine, and other
              professionals who serve homes and rentals across the corridor. Not the same as
              storefront service businesses with a fixed address (see{" "}
              <Link
                href="/service-businesses"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                storefront service businesses
              </Link>
              ).
            </p>
            <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">
              {totalCount} {totalCount === 1 ? "provider" : "providers"}
              {listedSpecialties.length > 0
                ? ` across ${listedSpecialties.length} ${listedSpecialties.length === 1 ? "specialty" : "specialties"}`
                : ""}
            </p>
            <form
              action={SERVICE_VENDORS_HUB_PATH}
              method="get"
              className="mt-6 flex max-w-md flex-wrap items-center gap-2"
            >
              {specialtySlug ? (
                <input type="hidden" name="specialty" value={specialtySlug} />
              ) : null}
              <div className="relative min-w-0 flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 !text-[1.1rem] text-[var(--color-text-tertiary)]">
                  search
                </span>
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search providers…"
                  className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-light)]"
              >
                Search
              </button>
            </form>
            <div className="mt-4">
              <Link
                href={discoveryHref(featureFlags, { type: "services" })}
                {...gaClickProps({
                  event: "cta_click",
                  category: "services_hub",
                  label: "advanced_search",
                })}
                className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                Advanced search (town, filters)
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
          <div className="mb-8">
            <ServiceSpecialtyBrowse
              groups={browseGroups}
              defaultOpenGroupSlug={openGroupSlug}
              allHref={serviceVendorsHubHref({ query: query || null })}
              allActive={!specialtySlug}
              query={query}
              specialtyHeading={SERVICE_VENDOR_UI.specialtyHeading}
              hubBrowseSubheading={SERVICE_VENDOR_UI.hubBrowseSubheading}
            />
          </div>

          {activeCategory ? (
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
              Showing <span className="font-semibold">{activeCategory.title}</span>
              {query ? (
                <>
                  {" "}
                  matching &ldquo;{query}&rdquo;
                </>
              ) : null}
              {" · "}
              <Link
                href={serviceVendorsSearchHref(activeCategory.slug)}
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                Open in search
              </Link>
            </p>
          ) : null}

          {vendors.length > 0 ? (
            <>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {vendors.map((v) => (
                  <li key={v.id}>
                    <BusinessPreviewCard
                      name={v.name}
                      slug={v.slug}
                      excerpt={v.excerpt}
                      heroImageUrl={v.hero_image_url}
                      meta={
                        [v.service_category_title, v.town_name].filter(Boolean).join(" · ") ||
                        null
                      }
                      analyticsCategory="services_hub"
                      analyticsLabel={v.slug}
                    />
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <nav
                  className="mt-10 flex flex-wrap items-center justify-center gap-2"
                  aria-label="Pagination"
                >
                  {page > 1 ? (
                    <Link
                      href={paginationHref(page - 1, specialtySlug, query)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                    >
                      Previous
                    </Link>
                  ) : null}
                  <span className="px-2 text-sm text-[var(--color-text-tertiary)]">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link
                      href={paginationHref(page + 1, specialtySlug, query)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                    >
                      Next
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : (
            <p className="text-[var(--color-text-secondary)]">
              No service providers found
              {activeCategory ? ` in ${activeCategory.title}` : ""}
              {query ? ` for “${query}”` : ""}.{" "}
              <Link href="/list-your-business" className="text-[var(--color-primary)] hover:underline">
                List your business
              </Link>
              .
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
