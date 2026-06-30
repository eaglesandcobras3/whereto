"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
  /** Larger typography and padding for the home hero. */
  variant?: "default" | "hero" | "hero-intent" | "compact";
  /** Enable glassmorphism sticky styling */
  sticky?: boolean;
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder = 'Try "kid friendly lunch near Seaside"',
  variant = "default",
  sticky = false,
}: Props) {
  const isHero = variant === "hero";
  const isHeroIntent = variant === "hero-intent";
  const isCompact = variant === "compact";

  const wrapperClasses = sticky
    ? "sticky top-16 z-30 rounded-2xl border border-[var(--color-border)] glass-strong p-4 shadow-premium-md"
    : "";

  if (isHeroIntent) {
    return (
      <div className={wrapperClasses}>
        <form
          onSubmit={onSubmit}
          className="group relative mx-auto w-full max-w-2xl"
        >
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-16 w-full rounded-full border border-[var(--color-border-ghost)] bg-[var(--color-surface)] pl-8 pr-[4.25rem] text-lg text-[var(--color-text-primary)] shadow-float placeholder:text-[var(--color-text-secondary)]/50 transition-premium-fast focus:outline-none focus:border-[var(--color-ink)] focus:ring-0"
          />
          <button
            type="submit"
            disabled={loading}
            title="Search"
            className="absolute right-2 top-2 bottom-2 flex aspect-square items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-light)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <svg
                className="size-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={wrapperClasses}>
      <form
        onSubmit={onSubmit}
        className={
          isHero
            ? "flex flex-col gap-3 rounded-2xl bg-[var(--color-surface-container-highest)] p-2 ring-1 ring-[var(--color-outline-variant)]/20 shadow-premium-elevated sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:pl-5 sm:pr-2 sm:pt-2 sm:pb-2"
            : `flex flex-col gap-3 sm:flex-row ${isCompact ? "sm:items-center" : "sm:items-center"}`
        }
      >
        <div className={`relative min-w-0 flex-1 ${isHero ? "" : ""}`}>
          {/* Search icon */}
          <svg
            className={`absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] ${
              isHero ? "h-5 w-5 sm:left-5" : "h-4 w-4"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`
              w-full bg-[var(--color-surface)] text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              transition-premium-fast
              ${
                isHero
                  ? "min-h-12 rounded-xl border-0 bg-transparent pl-12 pr-4 text-base focus:outline-none focus:ring-0 sm:min-h-14 sm:rounded-full sm:pl-14 sm:pr-5 sm:text-lg"
                  : isCompact
                    ? "min-h-10 rounded-2xl border border-[var(--color-border)] pl-10 pr-4 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    : "min-h-12 rounded-2xl border border-[var(--color-border-strong)] pl-11 pr-4 py-3 text-base focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              }
            `}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`
            shrink-0 bg-[var(--color-primary)] font-semibold text-white
            hover:opacity-90
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-premium-fast
            ${
              isHero
                ? "min-h-12 rounded-xl px-8 py-3 text-base sm:min-h-12 sm:rounded-full sm:px-8 sm:py-3 sm:text-sm"
                : isCompact
                  ? "min-h-10 rounded-2xl px-5 py-2 text-sm font-medium hover:bg-[var(--color-primary-light)]"
                  : "min-h-12 rounded-2xl px-6 py-3 text-base hover:bg-[var(--color-primary-light)]"
            }
          `}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {isHero ? "Searching..." : "..."}
            </span>
          ) : (
            "Search"
          )}
        </button>
      </form>
    </div>
  );
}
