import Link from "next/link";
import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { PlaceCategoryBusinessSections } from "@/components/discovery/PlaceCategoryBusinessSections";
import {
  countServiceVendors,
  getServiceVendorCategorySections,
} from "@/lib/data/service-vendors-hub";
import {
  SERVICE_VENDORS_HUB_PATH,
  serviceVendorsSearchHref,
} from "@/lib/routes/service-vendors-hub";
import { discoveryHref } from "@/lib/nav/discovery-links";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const revalidate = 3600;

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
      "Regional and mobile service providers for 30A — browse by category, then filter by town in search.",
  }),
};

export default async function ServiceVendorsHubPage() {
  const featureFlags = await getAllFeatureFlags();
  const [sections, totalCount] = await Promise.all([
    getServiceVendorCategorySections(),
    countServiceVendors(),
  ]);

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
              Regional and mobile vendors — contractors, trades, landscaping, cleaning, and
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
              {sections.length > 0
                ? ` across ${sections.length} ${sections.length === 1 ? "category" : "categories"}`
                : ""}
            </p>
            <div className="mt-6">
              <Link
                href={discoveryHref(featureFlags, { type: "services" })}
                {...gaClickProps({
                  event: "cta_click",
                  category: "services_hub",
                  label: "search_services",
                })}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-light)]"
              >
                Search service providers
                <span className="material-symbols-outlined !text-base">search</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <PlaceCategoryBusinessSections
            placeName="30A"
            placeSlug="services"
            sections={sections}
            buildSectionSearchHref={(section) => serviceVendorsSearchHref(section.slug)}
            analyticsCategoryPrefix="services_hub_category"
            heading="Browse by category"
            subheading="Each section opens search filtered to regional service providers in that category."
            emptyMessage={
              <p className="text-[var(--color-text-secondary)]">
                No service providers listed yet.{" "}
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
