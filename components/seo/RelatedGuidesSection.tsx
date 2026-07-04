import Link from "next/link";
import type { RelatedGuideLink } from "@/lib/seo/guide-related-links";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

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

  return (
    <section className="mt-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-low)] p-6">
      <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.slug}>
            <Link
              href={link.href}
              {...gaClickProps({
                event: "nav_click",
                category: analyticsCategory,
                label: link.slug,
              })}
              className="group block"
            >
              <span className="font-medium text-[var(--color-primary)] group-hover:underline">
                {link.title}
              </span>
              {link.reason ? (
                <span className="mt-0.5 block text-sm text-[var(--color-text-secondary)]">
                  {link.reason}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
