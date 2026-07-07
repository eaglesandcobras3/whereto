import Link from "next/link";
import type { Metadata } from "next";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { hubServicesIntro } from "@/lib/seo/page-intro-copy";
import { seoTitleSegmentForLayout } from "@/lib/seo/metadata-snippets";
import {
  countServiceVendors,
  getServiceSpecialtySections,
  listServiceCategories,
} from "@/lib/data/service-vendors-hub";
import { ServiceSpecialtySections } from "@/components/services/ServiceSpecialtySections";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";

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
  const [sections, categories, totalCount] = await Promise.all([
    getServiceSpecialtySections(""),
    listServiceCategories(),
    countServiceVendors(),
  ]);

  const listedSpecialties = categories.filter((c) => c.vendor_count > 0);
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
                : listedSpecialties.length > 0
                  ? ` across ${listedSpecialties.length} ${listedSpecialties.length === 1 ? "specialty" : "specialties"}`
                  : ""}
            </>
          }
        />

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <ServiceSpecialtySections
            sections={sections}
            analyticsCategoryPrefix="services_hub_specialty"
            subheading="Tap a group to expand and browse providers."
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
        </section>
      </main>
    </div>
  );
}
