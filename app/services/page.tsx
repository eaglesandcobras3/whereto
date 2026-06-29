import Link from "next/link";
import type { Metadata } from "next";
import { DiscoveryUtilityLink } from "@/components/nav/DiscoveryUtilityLink";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { hubServicesIntro } from "@/lib/seo/page-intro-copy";
import {
  countServiceVendors,
  getServiceSpecialtySections,
  listServiceCategories,
} from "@/lib/data/service-vendors-hub";
import { ServiceSpecialtySections } from "@/components/services/ServiceSpecialtySections";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import { discoveryHref, isDiscoveryEnabled } from "@/lib/nav/discovery-links";
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
    "Find regional service providers along Scenic 30A and South Walton: landscaping, cleaning, contractors, trades, and mobile vendors who work across the corridor.",
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
      "Regional and mobile service providers for 30A. Browse by specialty, then filter by town in search.",
  }),
};

export default async function ServiceVendorsHubPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";

  const featureFlags = await getAllFeatureFlags();
  const [sections, categories, totalCount] = await Promise.all([
    getServiceSpecialtySections(query),
    listServiceCategories(),
    countServiceVendors(),
  ]);

  const listedSpecialties = categories.filter((c) => c.vendor_count > 0);
  const listedGroups = sections.length;
  const advancedSearchHref = discoveryHref(featureFlags, { type: "services" });
  const showDiscoverySearch = isDiscoveryEnabled(featureFlags);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Services", url: SERVICE_VENDORS_HUB_PATH },
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="flex-1">
        <BrowseHubHero
          title="Service providers on 30A"
          description={
            <>
              Regional and mobile vendors for homes and rentals across the corridor: trades,
              insurance, legal, medical, marine, and more. Not the same as storefront service
              businesses with a fixed address (see{" "}
              <Link
                href="/service-businesses"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                storefront service businesses
              </Link>
              ).
            </>
          }
          collapsibleDescription={hubServicesIntro()}
          meta={
            <>
              {totalCount} {totalCount === 1 ? "provider" : "providers"}
              {listedGroups > 0
                ? ` across ${listedGroups} ${listedGroups === 1 ? "category" : "categories"}`
                : listedSpecialties.length > 0
                  ? ` across ${listedSpecialties.length} ${listedSpecialties.length === 1 ? "specialty" : "specialties"}`
                  : ""}
            </>
          }
        >
          {showDiscoverySearch ? (
            <form
              action={SERVICE_VENDORS_HUB_PATH}
              method="get"
              className="flex max-w-md flex-wrap items-center gap-2 pt-2"
            >
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
          ) : null}
          {showDiscoverySearch ? (
            <DiscoveryUtilityLink
              href={advancedSearchHref}
              {...gaClickProps({
                event: "cta_click",
                category: "services_hub",
                label: "advanced_search",
              })}
              className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Advanced search (town, filters)
            </DiscoveryUtilityLink>
          ) : null}
        </BrowseHubHero>

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <ServiceSpecialtySections
            sections={sections}
            analyticsCategoryPrefix="services_hub_specialty"
            subheading="Tap a group to expand and browse providers."
            emptyMessage={
              <p className="text-[var(--color-text-secondary)]">
                No service providers found
                {query ? ` for “${query}”` : ""}.{" "}
                <Link href="/list-your-business" className="text-[var(--color-primary)] hover:underline">
                  List your business
                </Link>
                .
              </p>
            }
          />
        </section>
      </main>
    </div>
  );
}
