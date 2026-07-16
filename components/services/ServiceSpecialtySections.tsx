"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import {
  isServiceBrowseGroupSlug,
  serviceBrowseGroupHubPath,
} from "@/lib/service-categories/browse-group-nav";
import {
  SERVICE_CATEGORY_GROUP_ICONS,
  type ServiceCategoryGroupSlug,
} from "@/lib/service-categories/groups";
import {
  isServiceUncategorizedSection,
  SERVICE_UNCATEGORIZED_ICON,
  serviceUncategorizedHubPath,
} from "@/lib/service-categories/uncategorized";
import type { ServiceSpecialtySection } from "@/lib/data/service-vendors-hub";
import Link from "next/link";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";

type Props = {
  sections: ServiceSpecialtySection[];
  analyticsCategoryPrefix: string;
  heading?: string;
  subheading?: string;
  emptyMessage?: ReactNode;
  defaultExpandedCount?: number;
};

export function ServiceSpecialtySections({
  sections,
  analyticsCategoryPrefix,
  heading,
  subheading,
  emptyMessage,
  defaultExpandedCount = 1,
}: Props) {
  const router = useRouter();
  const { expandedIds, toggle } = usePersistedExpandedSectionIds({
    sectionIds: sections.map((section) => section.id),
    defaultExpandedCount,
  });

  useEffect(() => {
    if (sections.length === 0) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !isServiceBrowseGroupSlug(hash)) return;
    router.replace(serviceBrowseGroupHubPath(hash));
  }, [sections, router]);

  if (sections.length === 0) {
    return emptyMessage ? <div>{emptyMessage}</div> : null;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          {heading ?? "Browse by category"}
        </h2>
        <p className="mt-1.5 text-left text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
          {subheading ?? "Tap a group to expand and browse providers."}
        </p>
      </div>

      {sections.map((section) => {
        const uncategorized = isServiceUncategorizedSection(section.slug);
        const icon = uncategorized
          ? SERVICE_UNCATEGORIZED_ICON
          : (SERVICE_CATEGORY_GROUP_ICONS[section.slug as ServiceCategoryGroupSlug] ??
            "home_repair_service");
        const viewAllHref = uncategorized
          ? serviceUncategorizedHubPath()
          : serviceBrowseGroupHubPath(section.slug as ServiceCategoryGroupSlug);
        const isOpen = expandedIds.has(section.id);

        return (
          <CollapsibleBrowseSection
            key={section.id}
            title={section.title}
            subtitle={`${section.totalCount} ${section.totalCount === 1 ? "provider" : "providers"}`}
            action={
              <Link
                href={viewAllHref}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                View all
              </Link>
            }
            icon={
              <span className="material-symbols-outlined text-xl" aria-hidden>
                {icon}
              </span>
            }
            open={isOpen}
            onToggle={() => toggle(section.id)}
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.vendors.map((vendor) => (
                <li key={vendor.id} className="h-full">
                  <BusinessPreviewCard
                    name={vendor.name}
                    slug={vendor.slug}
                    excerpt={vendor.excerpt}
                    analyticsCategory={`${analyticsCategoryPrefix}_vendor`}
                    analyticsLabel={vendor.slug}
                    hideImage
                  />
                </li>
              ))}
            </ul>
          </CollapsibleBrowseSection>
        );
      })}
    </div>
  );
}
