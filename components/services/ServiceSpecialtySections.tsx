"use client";

import { useState, useEffect, type ReactNode } from "react";
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
import type { ServiceSpecialtySection } from "@/lib/data/service-vendors-hub";
import Link from "next/link";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";

type Props = {
  sections: ServiceSpecialtySection[];
  analyticsCategoryPrefix: string;
  heading?: string;
  subheading?: string;
  emptyMessage?: ReactNode;
  defaultExpandedCount?: number;
};

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return desktop;
}

export function ServiceSpecialtySections({
  sections,
  analyticsCategoryPrefix,
  heading,
  subheading,
  emptyMessage,
  defaultExpandedCount = 1,
}: Props) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (isDesktop) {
      setExpandedIds((prev) => {
        if (prev.size > 0) return prev;
        const initial = new Set<string>();
        for (let i = 0; i < Math.min(defaultExpandedCount, sections.length); i++) {
          initial.add(sections[i]!.id);
        }
        return initial;
      });
    }
  }, [isDesktop, defaultExpandedCount, sections]);

  useEffect(() => {
    if (sections.length === 0) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !isServiceBrowseGroupSlug(hash)) return;
    router.replace(serviceBrowseGroupHubPath(hash));
  }, [sections, router]);

  if (sections.length === 0) {
    return emptyMessage ? <div>{emptyMessage}</div> : null;
  }

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
        const icon =
          SERVICE_CATEGORY_GROUP_ICONS[section.slug as ServiceCategoryGroupSlug] ??
          "home_repair_service";
        const isOpen = expandedIds.has(section.id);

        return (
          <CollapsibleBrowseSection
            key={section.id}
            title={section.title}
            subtitle={`${section.totalCount} ${section.totalCount === 1 ? "provider" : "providers"}`}
            action={
              <Link
                href={serviceBrowseGroupHubPath(section.slug as ServiceCategoryGroupSlug)}
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
