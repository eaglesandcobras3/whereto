"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
  /** Larger typography and padding for the home hero. */
  variant?: "default" | "hero" | "compact";
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
  const isCompact = variant === "compact";

  const wrapperClasses = sticky
    ? "sticky top-16 z-30 rounded-2xl border border-[var(--color-border)] glass-strong p-4 shadow-premium-md"
    : "";

  return (
    <div className={wrapperClasses}>
      <form
        onSubmit={onSubmit}
        className={`flex flex-col gap-3 sm:flex-row ${isHero ? "sm:items-stretch" : "sm:items-center"}`}
      >
        <div className="relative flex-1">
          {/* Search icon */}
          <svg
            className={`absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] ${
              isHero ? "h-5 w-5" : "h-4 w-4"
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
              w-full rounded-2xl border bg-[var(--color-surface)]
              text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20
              transition-premium-fast
              ${
                isHero
                  ? "min-h-14 border-[var(--color-border-strong)] pl-12 pr-5 py-4 text-base shadow-premium-sm sm:text-lg"
                  : isCompact
                    ? "min-h-10 border-[var(--color-border)] pl-10 pr-4 py-2 text-sm"
                    : "min-h-12 border-[var(--color-border-strong)] pl-11 pr-4 py-3 text-base"
              }
            `}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`
            shrink-0 rounded-2xl bg-[var(--color-primary)] font-semibold text-white
            hover:bg-[var(--color-primary-light)]
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-premium-fast
            ${
              isHero
                ? "min-h-14 px-8 py-4 text-base sm:text-lg"
                : isCompact
                  ? "min-h-10 px-5 py-2 text-sm font-medium"
                  : "min-h-12 px-6 py-3 text-base"
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
