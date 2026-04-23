"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { NavbarCategoryLinks } from "@/components/NavbarCategoryLinks";
import { NavbarMobileMenu } from "@/components/NavbarMobileMenu";
import { BROWSE_NAV_ITEMS, type BrowseNavItem } from "@/lib/nav/browse-links";
import { isAuthEnabled, isSavedEnabled } from "@/lib/feature-flags-core";
import type { User } from "@supabase/supabase-js";

type Props = {
  /** Show compact variant (no tagline, smaller padding) */
  compact?: boolean;
  /** Optional: show search in navbar */
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  searchLoading?: boolean;
  /** Feature flags passed from server */
  featureFlags?: Record<string, boolean>;
  /** Browse links (server can inject conditional items, e.g. Landmarks & parks). */
  browseNavItems?: BrowseNavItem[];
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
  featureFlags = {},
  browseNavItems = BROWSE_NAV_ITEMS,
}: Props) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [internalSearch, setInternalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isHome = pathname === "/";
  const showSearchInNavbar = showSearch || !isHome;
  const isSaved = pathname === "/saved" || pathname.startsWith("/saved/");
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const showAuth = isAuthEnabled(featureFlags);
  const showSaved = isSavedEnabled(featureFlags);

  const closePanels = useCallback(() => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    startTransition(() => {
      closePanels();
    });
  }, [pathname, closePanels]);

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen && !mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanels();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, mobileMenuOpen, closePanels]);

  const internalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(e);
    } else {
      const q = searchValue || internalSearch;
      if (!q.trim()) return;
      if (pathname === "/search" && typeof window !== "undefined") {
        const next = new URLSearchParams(window.location.search);
        next.set("q", q.trim());
        window.location.href = `/search?${next.toString()}`;
      } else {
        window.location.href = `/search?q=${encodeURIComponent(q)}`;
      }
    }
    setSearchOpen(false);
  };

  const cancelSearch = () => {
    setSearchOpen(false);
    if (!onSearchChange) setInternalSearch("");
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full glass-nav ${
        compact ? "py-2" : "py-4 md:py-5"
      } min-h-[var(--site-header-offset)]`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 md:gap-4 md:px-10">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span
              className={`font-headline font-extrabold tracking-tighter text-[var(--color-brand-wordmark)] ${
                compact ? "text-lg" : "text-xl md:text-2xl"
              }`}
            >
              WhereTo30A
            </span>
            {!compact && (
              <span className="hidden text-sm font-medium text-[var(--color-text-tertiary)] lg:inline">
                Discover the coast
              </span>
            )}
          </Link>
          <Suspense
            fallback={
              <span className="hidden h-9 w-48 animate-pulse rounded-md bg-[var(--color-surface-secondary)] md:block" />
            }
          >
            <NavbarCategoryLinks items={browseNavItems} />
          </Suspense>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {showSearchInNavbar ? (
            <button
              type="button"
              aria-expanded={searchOpen}
              aria-controls="navbar-search-panel"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen((o) => !o);
              }}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-premium-fast ${
                searchOpen
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              }`}
              title="Search"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>
          ) : null}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="navbar-mobile-menu"
            onClick={() => {
              setSearchOpen(false);
              setMobileMenuOpen((o) => !o);
            }}
            title={mobileMenuOpen ? "Close menu" : "Menu"}
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>

          <nav className="hidden items-center gap-0.5 md:flex sm:gap-1">
            {showSaved ? (
              <Link href="/saved" className={navLinkClass(isSaved)}>
                Saved
              </Link>
            ) : null}
            {showAuth && user ? (
              <Link href="/profile" className={navLinkClass(isProfile)}>
                Profile
              </Link>
            ) : showAuth ? (
              <Link href="/login" className={navLinkClass(pathname === "/login")}>
                Login
              </Link>
            ) : null}
          </nav>
        </div>
      </div>

      {searchOpen && showSearchInNavbar ? (
        <div
          id="navbar-search-panel"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/98 backdrop-blur-md"
        >
          <div className="mx-auto max-w-7xl px-4 py-3 md:px-10">
            <form onSubmit={internalSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </span>
                <input
                  ref={searchInputRef}
                  id="navbar-search-input"
                  type="search"
                  value={searchValue || internalSearch}
                  onChange={(e) => {
                    if (onSearchChange) onSearchChange(e.target.value);
                    else setInternalSearch(e.target.value);
                  }}
                  placeholder="Search places, restaurants, activities…"
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-2.5 pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] disabled:opacity-50"
                >
                  {searchLoading ? "…" : "Search"}
                </button>
                <button
                  type="button"
                  onClick={cancelSearch}
                  className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <Suspense fallback={null}>
        <NavbarMobileMenu
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          browseNavItems={browseNavItems}
          isSaved={isSaved}
          isProfile={isProfile}
          showAuth={showAuth}
          showSaved={showSaved}
          user={user}
        />
      </Suspense>
    </header>
  );
}
