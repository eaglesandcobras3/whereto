import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { serviceBrowseGroupHubPath } from "@/lib/service-categories/browse-group-nav";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import type { ServiceBrowseGroupHubPage } from "@/lib/data/service-browse-group-hub";

type Props = {
  hub: ServiceBrowseGroupHubPage;
};

export function ServiceBrowseGroupHubView({ hub }: Props) {
  const hubPath = serviceBrowseGroupHubPath(hub.slug);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Services", url: SERVICE_VENDORS_HUB_PATH },
    { name: hub.title, url: hubPath },
  ]);

  const itemListSchema = {
    ...generateItemListSchema(
      hub.vendors.slice(0, 50).map((v) => ({
        name: v.name,
        url: `/business/${v.slug}`,
      })),
    ),
    name: `${hub.title} service providers on 30A`,
    description: `Regional ${hub.title.toLowerCase()} vendors along Scenic 30A`,
    numberOfItems: hub.vendors.length,
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
          title={`${hub.title} on 30A`}
          description={`Regional and mobile ${hub.title.toLowerCase()} vendors for homes and rentals across the Scenic 30A corridor.`}
          collapsibleDescription="These providers typically travel across South Walton communities. Confirm service area, licensing, and availability directly with each vendor."
          meta={
            <>
              {hub.vendors.length} {hub.vendors.length === 1 ? "provider" : "providers"}
            </>
          }
        />

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hub.vendors.map((vendor) => (
              <li key={vendor.id} className="h-full">
                <BusinessPreviewCard
                  name={vendor.name}
                  slug={vendor.slug}
                  excerpt={vendor.excerpt}
                  analyticsCategory="services_group_vendor"
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
