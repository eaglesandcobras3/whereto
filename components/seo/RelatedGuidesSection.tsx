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
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-low)] p-6 sm:p-8">
      <header className="mb-6 max-w-2xl">
        <p className="text-eyebrow mb-3">Keep reading</p>
        <h2 className="text-editorial-headline text-2xl text-primary sm:text-3xl">{title}</h2>
      </header>

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
    </section>
  );
}
