import "server-only";

import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import {
  SERVICE_CATEGORY_GROUP_LABELS,
  type ServiceCategoryGroupSlug,
} from "@/lib/service-categories/groups";
import { serviceBrowseGroupHubPath } from "@/lib/service-categories/browse-group-nav";
import {
  loadServiceBrowseGroupVendors,
  type ServiceVendorRow,
} from "@/lib/data/service-vendors-hub";

export type ServiceBrowseGroupHubPage = {
  slug: ServiceCategoryGroupSlug;
  title: string;
  vendors: ServiceVendorRow[];
};

export async function loadServiceBrowseGroupHubPage(
  groupSlug: ServiceCategoryGroupSlug,
): Promise<ServiceBrowseGroupHubPage | null> {
  const vendors = await loadServiceBrowseGroupVendors(groupSlug);
  if (vendors.length === 0) return null;

  return {
    slug: groupSlug,
    title: SERVICE_CATEGORY_GROUP_LABELS[groupSlug],
    vendors,
  };
}

export async function buildServiceBrowseGroupHubMetadata(
  groupSlug: ServiceCategoryGroupSlug,
): Promise<Metadata> {
  const title = SERVICE_CATEGORY_GROUP_LABELS[groupSlug];
  const path = serviceBrowseGroupHubPath(groupSlug);
  const seoTitle = seoTitleSegmentForLayout(`${title} service providers on 30A`);
  const description = metaDescriptionSnippet(
    null,
    `Find ${title.toLowerCase()} service providers along Scenic 30A and South Walton, Florida — regional vendors and trades who work across the corridor.`,
  );

  return {
    ...canonicalAlternates(path),
    title: seoTitle,
    description,
    ...openGraphForPage({
      path,
      title: `${title} on 30A | WhereTo30A`,
      description,
    }),
  };
}
