import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** Optional "See all" link */
  seeAllHref?: string;
};

export function RecommendationCarousel({
  title,
  subtitle,
  children,
  className,
  seeAllHref,
}: Props) {
  return (
    <section className={className ?? "space-y-4"}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-section text-[var(--color-text-primary)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="shrink-0 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            See all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
