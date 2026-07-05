"use client";

import { useState } from "react";
import Link from "next/link";
import type { RelatedGuideLink } from "@/lib/seo/guide-related-links";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";

type Props = {
  title?: string;
  links: RelatedGuideLink[];
  analyticsCategory?: string;
};

export function RelatedGuidesSection({
  title = "Related guides",
  links,
  analyticsCategory = "related_guides",
}: Props) {
  const [open, setOpen] = useState(false);

  if (links.length === 0) return null;

  const preview =
    links.length === 1
      ? links[0].title
      : `${links[0].title}, ${links[1]?.title ?? ""}`.replace(/, $/, "");

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-low)] shadow-premium-sm">
      <div className="border-b border-[var(--color-border)] px-4 py-5 sm:px-6">
        <p className="text-eyebrow mb-2">Keep reading</p>
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          {title}
        </h2>
      </div>

      <div className="px-4 sm:px-6">
        <CollapsibleBrowseSection
          compact
          title="Guides for this trip"
          subtitle={preview}
          icon={
            <span className="material-symbols-outlined text-lg" aria-hidden>
              menu_book
            </span>
          }
          open={open}
          onToggle={() => setOpen((v) => !v)}
          className="py-3 sm:py-3.5"
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.slug}>
                <Link
                  href={link.href}
                  {...gaClickProps({
                    event: "nav_click",
                    category: analyticsCategory,
                    label: link.slug,
                  })}
                  className="group flex h-full flex-col gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-colors hover:border-[var(--color-primary)] sm:p-4"
                >
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] sm:text-base">
                    {link.title}
                  </span>
                  {link.reason ? (
                    <span className="text-xs leading-relaxed text-[var(--color-text-secondary)] sm:text-sm">
                      {link.reason}
                    </span>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold text-[var(--color-primary)] sm:text-sm">
                    Read guide
                    <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleBrowseSection>
      </div>
    </section>
  );
}
