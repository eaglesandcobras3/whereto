export default function SearchLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <div className="sticky top-[var(--site-header-offset)] z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4">
          <div className="h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-[var(--color-surface-container-high)]" />
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 lg:w-2/3">
              <div className="mb-8 space-y-3">
                <div className="h-8 w-3/4 max-w-md animate-pulse rounded-lg bg-[var(--color-surface-container-high)]" />
                <div className="h-4 w-full max-w-xl animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                <div className="h-4 w-2/3 max-w-lg animate-pulse rounded bg-[var(--color-surface-container-high)]" />
              </div>

              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:gap-6 sm:p-6"
                  >
                    <div className="aspect-[16/10] w-full shrink-0 animate-pulse rounded-lg bg-[var(--color-surface-container-high)] sm:aspect-[4/3] sm:w-40" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                      <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                      <div className="mt-2 h-3 w-full animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                      <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                      <div className="mt-2 flex gap-2">
                        <div className="h-6 w-14 animate-pulse rounded-full bg-[var(--color-surface-container-high)]" />
                        <div className="h-6 w-14 animate-pulse rounded-full bg-[var(--color-surface-container-high)]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="lg:w-1/3">
              <div className="sticky top-32 space-y-8">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="h-3 w-28 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                  <ul className="mt-4 space-y-4">
                    {[1, 2, 3].map((j) => (
                      <li key={j} className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-[var(--color-surface-container-high)]" />
                        <div className="h-4 flex-1 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="h-3 w-32 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                  <ul className="mt-4 space-y-3">
                    {[1, 2, 3, 4].map((k) => (
                      <li key={k} className="flex items-center gap-2">
                        <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                        <div className="h-4 flex-1 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
