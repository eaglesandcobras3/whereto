import type { ReactNode } from "react";

type DiscoverPageLoadingProps = {
  message?: string;
  /** Full page shell (route loading) vs results panel only (filter transition). */
  variant?: "page" | "results" | "map";
};

function ListingRowSkeleton() {
  return (
    <div className="flex min-h-[10.5rem] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] sm:min-h-[12rem]">
      <div className="skeleton aspect-[2/3] w-28 shrink-0 sm:w-32 md:w-36" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
        <div className="skeleton h-6 w-2/3 max-w-xs" />
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-1 h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="mt-auto flex gap-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-3 w-12" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-24 rounded-full" />
          <div className="skeleton h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-14" />
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-10" />
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <section
      aria-hidden
      className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      ))}
    </section>
  );
}

function MapSkeleton() {
  return (
    <div
      className="flex min-h-[28rem] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
        <span
          className="inline-block size-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
        />
        Loading map…
      </div>
    </div>
  );
}

function ResultsSkeleton({ message }: { message: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <span
          className="inline-block size-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
          aria-hidden
        />
        <span>{message}</span>
      </div>
      <ul className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <li key={i}>
            <ListingRowSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageChrome({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[var(--color-background)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-10">
          <div className="skeleton mb-2 h-3 w-24" />
          <div className="skeleton h-8 w-56 max-w-full sm:h-9" />
          <div className="skeleton mt-3 h-4 w-full max-w-2xl" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-10">{children}</div>
    </div>
  );
}

export function DiscoverPageLoading({
  message = "Loading discover…",
  variant = "page",
}: DiscoverPageLoadingProps) {
  if (variant === "results") {
    return <ResultsSkeleton message={message} />;
  }

  if (variant === "map") {
    return (
      <PageChrome>
        <div className="flex flex-col gap-6">
          <FilterBarSkeleton />
          <MapSkeleton />
          <ResultsSkeleton message={message} />
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <SidebarSkeleton />
        </aside>
        <main className="min-w-0 flex-1">
          <ResultsSkeleton message={message} />
        </main>
      </div>
    </PageChrome>
  );
}
