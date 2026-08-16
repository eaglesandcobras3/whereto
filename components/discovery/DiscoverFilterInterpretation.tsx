"use client";

import { formatDiscoverInterpretation } from "@/lib/discovery-filters/format-discover-interpretation";

type Props = {
  nlQuery?: string;
  interpretation: string;
  loading?: boolean;
};

export function DiscoverFilterInterpretation({ nlQuery, interpretation, loading }: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-3"
      aria-live="polite"
      aria-busy={loading || undefined}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
        From your search
      </p>
      {nlQuery ? (
        <p className="mt-1 font-headline text-base font-semibold text-[var(--color-text-primary)]">
          &ldquo;{nlQuery}&rdquo;
        </p>
      ) : null}
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-3.5 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
              aria-hidden
            />
            Translating filters…
          </span>
        ) : (
          interpretation
        )}
      </p>
      <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
        Filters in the sidebar match this search. Remove towns, keywords, or categories to narrow
        results.
      </p>
    </section>
  );
}

export { formatDiscoverInterpretation };
