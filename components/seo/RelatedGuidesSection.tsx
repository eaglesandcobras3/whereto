"use client";

import Link from "next/link";
import type { RelatedGuideLink } from "@/lib/seo/guide-related-links";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

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
  if (links.length === 0) return null;

  const preview =
    links.length === 1
      ? links[0].title
      : `${links[0].title}, ${links[1]?.title ?? ""}`.replace(/, $/, "");

  return (
    <CollapsibleSection
      variant="card"
      headingLevel={2}
      defaultOpen={false}
      icon="menu_book"
      title={title}
      meta={<span className="text-eyebrow font-normal normal-case tracking-normal">Keep reading</span>}
      preview={preview}
      className="bg-[var(--color-surface-container-low)]"
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.slug}>
            <Link
              href={link.href}
              {...gaClickProps({
                event: "nav_click",
                category: analyticsCategory,
                label: link.slug,
              })}
              className="editorial-card group flex h-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md"
            >
              <span className="font-headline text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                {link.title}
              </span>
              {link.reason ? (
                <span className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {link.reason}
                </span>
              ) : null}
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-[var(--color-primary)]">
                Read guide
                <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
