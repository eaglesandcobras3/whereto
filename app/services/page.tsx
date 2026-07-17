import Link from "next/link";
import type { Metadata } from "next";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubSections } from "@/components/browse/CategoryHubSections";
import { ListBusinessHomeCta } from "@/components/home/ListBusinessHomeCta";
import {
  countCategoryHubBusinesses,
  getCategoryHubSections,
} from "@/lib/data/category-hub";
import { countUncategorizedServiceVendors } from "@/lib/data/service-vendors-hub";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import { serviceUncategorizedHubPath } from "@/lib/service-categories/uncategorized";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { seoTitleSegmentForLayout } from "@/lib/seo/metadata-snippets";
import { hubServicesIntro } from "@/lib/seo/page-intro-copy";
import { openGraphForPage } from "@/lib/seo/social-metadata";

export const revalidate = 21600;

export const metadata: Metadata = {
  ...canonicalAlternates(SERVICE_VENDORS_HUB_PATH),
  title: seoTitleSegmentForLayout("30A Service Providers | Contractors & Trades"),
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
      "Regional and mobile service providers for 30A. Browse by specialty and town coverage.",
  }),
};

export default async function ServiceVendorsHubPage() {
  const [sections, totalCount, uncategorizedCount] = await Promise.all([
    getCategoryHubSections("service"),
    countCategoryHubBusinesses("service"),
    countUncategorizedServiceVendors(),
  ]);

  const listedGroups = sections.length;

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
          description="Regional and mobile vendors for homes and rentals across the corridor: trades, insurance, legal, medical, marine, and more."
          collapsibleDescription={hubServicesIntro()}
          meta={
            <>
              {totalCount} {totalCount === 1 ? "provider" : "providers"}
              {listedGroups > 0
                ? ` across ${listedGroups} ${listedGroups === 1 ? "category" : "categories"}`
                : ""}
            </>
          }
        />

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <CategoryHubSections
            sections={sections}
            analyticsCategoryPrefix="services_hub"
            heading="Browse by category"
            subheading="Service and appointment-based providers. Tap a group to expand."
            emptyMessage={
              <p className="text-[var(--color-text-secondary)]">
                No service providers found.{" "}
                <Link href="/list-your-business" className="text-[var(--color-primary)] hover:underline">
                  List your business
                </Link>
                .
              </p>
            }
          />
          {uncategorizedCount > 0 ? (
            <p className="mt-8 text-sm text-[var(--color-text-secondary)]">
              {uncategorizedCount} provider{uncategorizedCount === 1 ? "" : "s"} still need a
              category.{" "}
              <Link
                href={serviceUncategorizedHubPath()}
                className="font-semibold text-[var(--color-primary)] hover:underline"
              >
                View uncategorized
              </Link>
              .
            </p>
          ) : null}
        </section>

        <ListBusinessHomeCta />
      </main>
    </div>
  );
}
