"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { NavbarCategoryLinks } from "@/components/NavbarCategoryLinks";
import { NavbarMobileMenu } from "@/components/NavbarMobileMenu";
import { BROWSE_NAV_ITEMS, type BrowseNavItem } from "@/lib/nav/browse-links";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isOnboardEnabled } from "@/lib/feature-flags-core";
import {
  applyDiscoveryBrowseNav,
  discoveryHref,
  showNavbarAskUi,
  showNavbarSearchUi,
} from "@/lib/nav/discovery-links";
import type { User } from "@supabase/supabase-js";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { gaEvent } from "@/lib/analytics/gtag-runner";

type Props = {
  /** Show compact variant (no tagline, smaller padding) */
  compact?: boolean;
  /** Optional: show search in navbar */
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  searchLoading?: boolean;
  /** Browse links (server can inject conditional items, e.g. Landmarks & parks). */
  browseNavItems?: BrowseNavItem[];
};

function navLinkClass(active: boolean) {
  const base =
    "inline-flex items-center px-3 py-2 text-sm font-semibold tracking-tight font-headline border-b-2 transition-premium-fast";
  return active
    ? `${base} text-[var(--color-logo-navy)] border-[var(--color-logo-navy)]`
    : `${base} text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-logo-navy)] hover:text-[var(--color-logo-navy)]`;
}

export function Navbar({
  compact = false,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  searchLoading,
  browseNavItems: browseNavItemsProp = BROWSE_NAV_ITEMS,
}: Props) {
  const featureFlags = useAppFeatureFlags();
  const onboardEnabled = isOnboardEnabled(featureFlags);
  const browseNavItems = applyDiscoveryBrowseNav(browseNavItemsProp, featureFlags);

  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showAdminNav, setShowAdminNav] = useState(false);
  const [showPortalNav, setShowPortalNav] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavSearchPending, startNavSearchTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isHome = pathname === "/";
  const showSearchInNavbar =
    showNavbarSearchUi(featureFlags) && (showSearch || !isHome);
  const showAskInNavbar = showNavbarAskUi(featureFlags);
  const isAskRoute = pathname === "/ask" || pathname.startsWith("/ask/");
  const isSaved = pathname === "/saved" || pathname.startsWith("/saved/");
  const isAccount = pathname === "/profile" || pathname.startsWith("/profile/");
  const isPortalRoute = pathname === "/portal" || pathname.startsWith("/portal/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const showAuth = true;
  /** Product: keep /saved and /login routes; hide nav links to them. */
  const showHeaderSaved = false;
  const showHeaderLogin = false;
  const showSaved = showHeaderSaved;

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
    if (!user) {
      setShowAdminNav(false);
      setShowPortalNav(false);
      return;
    }
    fetch("/api/admin/me")
      .then(async (res) => {
        const j = (await res.json()) as { showAdminNav?: boolean };
        setShowAdminNav(Boolean(res.ok && j.showAdminNav));
      })
      .catch(() => setShowAdminNav(false));
  }, [user]);

  useEffect(() => {
    if (!user || !onboardEnabled) {
      setShowPortalNav(false);
      return;
    }
    fetch("/api/portal/me")
      .then(async (res) => {
        const j = (await res.json()) as { hasPortalActivity?: boolean };
        setShowPortalNav(Boolean(res.ok && j.hasPortalActivity));
      })
      .catch(() => setShowPortalNav(false));
  }, [user, onboardEnabled]);

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
      const term = q.trim();
      if (!term) return;
      gaEvent("search", {
        search_term: term.slice(0, 200),
        source: pathname === "/" ? "home_nav_overlap" : "navbar",
      });
      startNavSearchTransition(() => {
        router.push(discoveryHref(featureFlags, { q: term }));
      });
    }
    setSearchOpen(false);
  };

  const cancelSearch = () => {
    setSearchOpen(false);
    if (!onSearchChange) setInternalSearch("");
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-site-chrome)] shadow-[var(--shadow-nav)] ${
        compact ? "py-3" : "py-3.5 md:py-4"
      }`}
    >
      <div className="relative z-[120] mx-auto flex w-full max-w-7xl items-center px-4 md:gap-3 md:px-10">
        <div className="flex min-w-0 shrink-0 items-center md:flex-1">
          <Link
            href="/"
            {...gaClickProps({ event: "nav_click", category: "header", label: "logo_home" })}
            className="flex min-w-0 items-center gap-2"
          >
            <img
              src="/whereto30a.svg"
              alt="WhereTo30A"
              className={
                compact
                  ? "h-7 w-auto shrink-0 md:h-8"
                  : "h-7 w-auto shrink-0 md:h-9"
              }
              width={737}
              height={182}
              decoding="async"
            />
            {!compact && (
              <span className="hidden text-sm font-medium text-[var(--color-text-tertiary)] lg:inline">
                Discover the coast
              </span>
            )}
          </Link>
        </div>

        <Suspense
          fallback={
            <span className="hidden h-12 w-48 shrink-0 animate-pulse rounded-md bg-[var(--color-surface-secondary)] md:block" />
          }
        >
          <NavbarCategoryLinks items={browseNavItems} />
        </Suspense>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          {showAskInNavbar ? (
            <Link
              href="/ask"
              {...gaClickProps({ event: "nav_click", category: "header", label: "ask_concierge" })}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-premium-fast ${
                isAskRoute
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-logo-navy)] hover:text-[var(--color-logo-navy)]"
              }`}
              title="Ask WhereTo30A"
            >
              <span className="material-symbols-outlined text-[22px]">chat</span>
            </Link>
          ) : null}

          {showSearchInNavbar ? (
            <button
              type="button"
              {...gaClickProps({ event: "ui_open", category: "header", label: "search_panel" })}
              aria-expanded={searchOpen}
              aria-controls="navbar-search-panel"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen((o) => !o);
              }}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-premium-fast ${
                searchOpen
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-logo-navy)] hover:text-[var(--color-logo-navy)]"
              }`}
              title="Search"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>
          ) : null}

          <button
            type="button"
            {...gaClickProps({ event: "ui_open", category: "header", label: "mobile_menu" })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-logo-navy)] hover:text-[var(--color-logo-navy)] md:hidden"
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
              <Link {...gaClickProps({ event: "nav_click", category: "header_auth", label: "saved" })} href="/saved" className={navLinkClass(isSaved)}>
                Saved
              </Link>
            ) : null}
            {showAuth && user && showPortalNav ? (
              <Link
                {...gaClickProps({ event: "nav_click", category: "header_auth", label: "business_portal" })}
                href="/portal"
                className={navLinkClass(isPortalRoute)}
              >
                Business Portal
              </Link>
            ) : null}
            {showAuth && user && showAdminNav ? (
              <Link
                {...gaClickProps({ event: "nav_click", category: "header_auth", label: "admin" })}
                href="/admin"
                className={navLinkClass(isAdminRoute)}
              >
                Admin
              </Link>
            ) : null}
            {showAuth && user ? (
              <Link
                {...gaClickProps({ event: "nav_click", category: "header_auth", label: "account" })}
                href="/profile"
                className={navLinkClass(isAccount)}
              >
                Account
              </Link>
            ) : showAuth && showHeaderLogin ? (
              <Link
                {...gaClickProps({ event: "nav_click", category: "header_auth", label: "login" })}
                href="/login"
                className={navLinkClass(pathname === "/login")}
              >
                Login
              </Link>
            ) : null}
          </nav>
        </div>
      </div>

      {searchOpen && showSearchInNavbar ? (
        <div
          id="navbar-search-panel"
          className="border-t border-[var(--color-border)] bg-[var(--color-site-chrome)] backdrop-blur-md"
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
                  {...gaClickProps({ event: "search_click", category: "header_search", label: "submit_panel" })}
                  disabled={Boolean(searchLoading) || (!onSearchSubmit && isNavSearchPending)}
                  aria-busy={Boolean(searchLoading) || (!onSearchSubmit && isNavSearchPending) || undefined}
                  className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] disabled:opacity-50"
                >
                  {searchLoading || (!onSearchSubmit && isNavSearchPending) ? "Searching…" : "Search"}
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
          isAccount={isAccount}
          isPortalRoute={isPortalRoute}
          showPortalNav={showPortalNav}
          showAdminNav={showAdminNav}
          isAdminRoute={isAdminRoute}
          showAuth={showAuth}
          showSaved={showSaved}
          showLogin={showHeaderLogin}
          user={user}
        />
      </Suspense>
    </header>
  );
}
