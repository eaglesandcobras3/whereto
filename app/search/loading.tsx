import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Navbar } from "@/components/Navbar";

export default function SearchLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar compact />
      
      <div className="sticky top-16 z-30 border-b border-[var(--color-border-strong)] bg-[var(--color-surface)]/80 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-10">
          <div className="h-10 w-full max-w-2xl rounded-2xl bg-[var(--color-surface-container-high)] animate-pulse" />
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto flex h-full max-w-[1600px]">
          <div className="w-full flex-1 border-r border-[var(--color-border-strong)] bg-[var(--color-surface)] lg:max-w-[60%] xl:max-w-[55%] px-4 py-6 md:px-8">
            <div className="mb-8 space-y-4">
              <div className="h-8 w-64 rounded bg-[var(--color-surface-container-high)] animate-pulse" />
              <div className="h-4 w-full rounded bg-[var(--color-surface-container-high)] animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-[var(--color-surface-container-high)] animate-pulse" />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[1, 2, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/3] w-full rounded-2xl bg-[var(--color-surface-container-high)] animate-pulse" />
              ))}
            </div>
          </div>
          <div className="hidden flex-1 lg:block bg-[var(--color-surface-container-low)]" />
        </div>
      </main>
    </div>
  );
}
