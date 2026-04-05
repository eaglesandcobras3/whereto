"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  /** Show compact variant (no tagline, smaller padding) */
  compact?: boolean;
  /** Optional: show search in navbar */
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  searchLoading?: boolean;
};

export function Navbar({
  compact = false,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  searchLoading,
}: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-[var(--color-border)] glass-strong ${
        compact ? "py-3" : "py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white font-bold text-sm">
            W
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-semibold text-[var(--color-text-primary)]">
              WhereTo30A
            </span>
            {!compact && (
              <span className="ml-2 text-sm text-[var(--color-text-tertiary)]">
                Discover the coast
              </span>
            )}
          </div>
        </Link>

        {/* Center: Search (optional) */}
        {showSearch && onSearchChange && onSearchSubmit ? (
          <form
            onSubmit={onSearchSubmit}
            className="flex-1 max-w-xl hidden md:flex items-center gap-2"
          >
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]"
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
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search places, restaurants, activities..."
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-premium-fast"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] disabled:opacity-50 transition-premium-fast"
            >
              {searchLoading ? "..." : "Search"}
            </button>
          </form>
        ) : null}

        {/* Right: Navigation + Theme Toggle */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {!isHome && (
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-premium-fast"
            >
              Home
            </Link>
          )}
          <Link
            href="/30a"
            className="hidden sm:block rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-premium-fast"
          >
            Towns
          </Link>
          <Link
            href="/saved"
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-premium-fast"
          >
            Saved
          </Link>
          <div className="ml-1 sm:ml-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
