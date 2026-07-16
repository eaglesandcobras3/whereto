import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { loadUncategorizedServiceVendors } from "@/lib/data/service-vendors-hub";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import {
  SERVICE_UNCATEGORIZED_TITLE,
  serviceUncategorizedHubPath,
} from "@/lib/service-categories/uncategorized";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { openGraphForPage } from "@/lib/seo/social-metadata";

export const revalidate = 21600;

const hubPath = serviceUncategorizedHubPath();

export const metadata: Metadata = {
  ...canonicalAlternates(hubPath),
  title: seoTitleSegmentForLayout("Other service providers on 30A"),
  description: metaDescriptionSnippet(
    null,
    "Additional regional service providers on Scenic 30A that are not yet filed under a specialty group.",
  ),
  ...openGraphForPage({
    path: hubPath,
    title: "Other service providers on 30A | WhereTo30A",
    description:
      "Regional service providers on 30A awaiting a specialty classification.",
  }),
};

export default async function UncategorizedServiceVendorsPage() {
  const vendors = await loadUncategorizedServiceVendors();
  if (vendors.length === 0) notFound();

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Services", url: SERVICE_VENDORS_HUB_PATH },
    { name: SERVICE_UNCATEGORIZED_TITLE, url: hubPath },
  ]);

  const itemListSchema = {
    ...generateItemListSchema(
      vendors.slice(0, 50).map((v) => ({
        name: v.name,
        url: `/business/${v.slug}`,
      })),
    ),
    name: "Other service providers on 30A",
    description: "Regional service providers without a specialty classification",
    numberOfItems: vendors.length,
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
        <BrowseHubHero
          title={`${SERVICE_UNCATEGORIZED_TITLE} on 30A`}
          description="Regional and mobile vendors that are not yet filed under a specialty group. Confirm service area and availability directly with each provider."
          collapsibleDescription="These listings are live service businesses missing a specialty. Assigning one (legal, HVAC, insurance, etc.) moves them into the matching Services browse group."
          meta={
            <>
              {vendors.length} {vendors.length === 1 ? "provider" : "providers"}
            </>
          }
        />

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <li key={vendor.id} className="h-full">
                <BusinessPreviewCard
                  name={vendor.name}
                  slug={vendor.slug}
                  excerpt={vendor.excerpt}
                  analyticsCategory="services_uncategorized_vendor"
                  analyticsLabel={vendor.slug}
                  hideImage
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
