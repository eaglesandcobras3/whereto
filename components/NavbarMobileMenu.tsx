"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AuthSessionUser } from "@/lib/auth/types";
import { BROWSE_NAV_ITEMS, isBrowseNavActive, type BrowseNavItem } from "@/lib/nav/browse-links";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

function navLinkClassMobile(active: boolean) {
  const base =
    "block rounded-lg px-3 py-2.5 text-sm font-semibold tracking-tight font-headline transition-colors";
  return active
    ? `${base} bg-[var(--color-logo-navy)]/10 text-[var(--color-logo-navy)]`
    : `${base} text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-logo-navy)]`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  browseNavItems?: BrowseNavItem[];
  isSaved: boolean;
  isAccount: boolean;
  isPortalRoute: boolean;
  showPortalNav: boolean;
  showAdminNav: boolean;
  isAdminRoute: boolean;
  showAuth: boolean;
  showSaved: boolean;
  showLogin: boolean;
  user: AuthSessionUser | null;
};

export function NavbarMobileMenu({
  open,
  onClose,
  browseNavItems = BROWSE_NAV_ITEMS,
  isSaved,
  isAccount,
  isPortalRoute,
  showPortalNav,
  isAdminRoute,
  showAdminNav,
  showAuth,
  showSaved,
  showLogin,
  user,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] bg-black/25 md:hidden"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        id="navbar-mobile-menu"
        className="absolute left-0 right-0 top-full z-[110] max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-[var(--color-border)] bg-[var(--color-site-chrome)] shadow-lg md:hidden"
      >
        <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
          {browseNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              {...gaClickProps({
                event: "nav_click",
                category: "header_browse_mobile",
                label: item.label.replace(/\s+/g, "_").toLowerCase(),
              })}
              className={navLinkClassMobile(isBrowseNavActive(pathname, type, item))}
            >
              {item.label}
            </Link>
          ))}
          {showSaved ? (
            <Link {...gaClickProps({ event: "nav_click", category: "header_auth_mobile", label: "saved" })} href="/saved" onClick={onClose} className={navLinkClassMobile(isSaved)}>
              Saved
            </Link>
          ) : null}
          {showAuth && user && showPortalNav ? (
            <Link
              {...gaClickProps({ event: "nav_click", category: "header_auth_mobile", label: "business_portal" })}
              href="/portal"
              onClick={onClose}
              className={navLinkClassMobile(isPortalRoute)}
            >
              Business Portal
            </Link>
          ) : null}
          {showAuth && user && showAdminNav ? (
            <Link
              {...gaClickProps({ event: "nav_click", category: "header_auth_mobile", label: "admin" })}
              href="/admin"
              onClick={onClose}
              className={navLinkClassMobile(isAdminRoute)}
            >
              Admin
            </Link>
          ) : null}
          {showAuth && user ? (
            <Link
              {...gaClickProps({ event: "nav_click", category: "header_auth_mobile", label: "account" })}
              href="/profile"
              onClick={onClose}
              className={navLinkClassMobile(isAccount)}
            >
              Account
            </Link>
          ) : showAuth && showLogin ? (
            <Link
              {...gaClickProps({ event: "nav_click", category: "header_auth_mobile", label: "login" })}
              href="/login"
              onClick={onClose}
              className={navLinkClassMobile(pathname === "/login")}
            >
              Login
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
