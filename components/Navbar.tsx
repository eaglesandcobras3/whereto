"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";

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

function navLinkClass(active: boolean) {
  const base =
    "inline-flex items-center px-3 py-2 text-sm font-semibold tracking-tight font-headline border-b-2 transition-premium-fast";
  return active
    ? `${base} text-[var(--color-primary)] border-[var(--color-primary)]`
    : `${base} text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-outline-variant)] hover:text-[var(--color-primary)]`;
}

export function Navbar({
  compact = false,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  searchLoading,
}: Props) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [internalSearch, setInternalSearch] = useState("");
  const isHome = pathname === "/";
  const isGuide = pathname === "/guide" || pathname.startsWith("/guide/");
  const isTowns =
    pathname === PRIMARY_REGION_HUB_PATH ||
    pathname.startsWith(`${PRIMARY_REGION_HUB_PATH}/`);
  const isSaved = pathname === "/saved" || pathname.startsWith("/saved/");
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const internalSubmit = (e: React.FormEvent) => {
    if (onSearchSubmit) {
      onSearchSubmit(e);
    } else {
      e.preventDefault();
      const q = searchValue || internalSearch;
      if (!q.trim()) return;
      window.location.href = `/search?q=${encodeURIComponent(q)}`;
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full glass-nav ${
        compact ? "py-3" : "py-4 md:py-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 md:px-10">
        {/* Logo / Brand — /design wordmark */}
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <span
            className={`font-headline font-extrabold tracking-tighter text-[var(--color-brand-wordmark)] ${
              compact ? "text-lg" : "text-xl md:text-2xl"
            }`}
          >
            WhereTo30A
          </span>
          {!compact && (
            <span className="hidden lg:inline text-sm font-medium text-[var(--color-text-tertiary)]">
              Discover the coast
            </span>
          )}
        </Link>

        {/* Center: Search (optional) */}
        {showSearch ? (
          <form
            onSubmit={internalSubmit}
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
                value={searchValue || internalSearch}
                onChange={(e) => {
                  if (onSearchChange) onSearchChange(e.target.value);
                  else setInternalSearch(e.target.value);
                }}
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

        {/* Right: Navigation */}
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {!isHome && (
            <Link href="/" className={navLinkClass(false)}>
              Home
            </Link>
          )}
          <Link
            href="/guide"
            className={`hidden sm:inline-flex ${navLinkClass(isGuide)}`}
          >
            Guide
          </Link>
          <Link
            href={PRIMARY_REGION_HUB_PATH}
            className={`hidden md:inline-flex ${navLinkClass(isTowns)}`}
          >
            Towns
          </Link>
          <Link href="/saved" className={navLinkClass(isSaved)}>
            Saved
          </Link>
          {user ? (
            <Link href="/profile" className={navLinkClass(isProfile)}>
              Profile
            </Link>
          ) : (
            <Link href="/login" className={navLinkClass(pathname === "/login")}>
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
