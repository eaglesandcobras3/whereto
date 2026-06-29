"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { browseGroupIcon } from "@/lib/business-categories/group-browse-sections";
import type { BusinessCategoryGroupSlug } from "@/lib/business-categories/groups";
import {
  businessBrowseGroupHubPath,
  isBusinessBrowseGroupSlug,
} from "@/lib/business-categories/browse-group-nav";
import type { CategoryHubSection } from "@/lib/data/category-hub";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";

type Props = {
  sections: CategoryHubSection[];
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

export function CategoryHubSections({
  sections,
  analyticsCategoryPrefix,
  heading,
  subheading,
  emptyMessage,
  defaultExpandedCount = 1,
}: Props) {
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
    if (!hash || !isBusinessBrowseGroupSlug(hash)) return;
    if (!sections.some((s) => s.slug === hash)) return;

    setExpandedIds((prev) => new Set([...prev, hash]));
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [sections]);

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
          {subheading ?? "Tap a group to expand and browse listings."}
        </p>
      </div>

      {sections.map((section) => {
        const iconSlug = browseGroupIcon(section.slug as BusinessCategoryGroupSlug);
        const isOpen = expandedIds.has(section.id);

        return (
          <CollapsibleBrowseSection
            key={section.id}
            sectionId={section.slug}
            title={section.title}
            subtitle={`${section.totalCount} ${section.totalCount === 1 ? "listing" : "listings"}`}
            action={
              <Link
                href={businessBrowseGroupHubPath(section.slug as BusinessCategoryGroupSlug)}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                View by town
              </Link>
            }
            icon={
              <span className="material-symbols-outlined text-xl" aria-hidden>
                {iconSlug}
              </span>
            }
            open={isOpen}
            onToggle={() => toggle(section.id)}
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.businesses.map((business) => (
                <li key={business.id} className="h-full">
                  <BusinessPreviewCard
                    name={business.name}
                    slug={business.slug}
                    excerpt={business.ai_summary}
                    heroImageUrl={business.hero_image_url}
                    analyticsCategory={`${analyticsCategoryPrefix}_business`}
                    analyticsLabel={business.slug}
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
