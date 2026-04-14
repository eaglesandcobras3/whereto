export default function SearchLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <div className="sticky top-[var(--site-header-offset)] z-30 border-b border-[var(--color-border-strong)] bg-[var(--color-surface)]/80 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-10">
          <div className="h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-[var(--color-surface-container-high)]" />
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto flex h-full max-w-[1600px]">
          <div className="w-full flex-1 border-r border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-6 md:px-8 lg:max-w-[60%] xl:max-w-[55%]">
            <div className="mb-8 space-y-4">
              <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
              <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-container-high)]" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[1, 2, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-[var(--color-surface-container-high)]"
                />
              ))}
            </div>
          </div>
          <div className="hidden flex-1 bg-[var(--color-surface-container-low)] lg:block" />
        </div>
      </main>
    </div>
  );
}
