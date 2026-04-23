"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { BROWSE_NAV_ITEMS, isBrowseNavActive, type BrowseNavItem } from "@/lib/nav/browse-links";

function navLinkClassMobile(active: boolean) {
  const base =
    "block rounded-lg px-3 py-2.5 text-sm font-semibold tracking-tight font-headline transition-colors";
  return active
    ? `${base} bg-[var(--color-primary)]/10 text-[var(--color-primary)]`
    : `${base} text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  browseNavItems?: BrowseNavItem[];
  isSaved: boolean;
  isProfile: boolean;
  showAuth: boolean;
  showSaved: boolean;
  user: User | null;
};

export function NavbarMobileMenu({
  open,
  onClose,
  browseNavItems = BROWSE_NAV_ITEMS,
  isSaved,
  isProfile,
  showAuth,
  showSaved,
  user,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const isSearch = pathname === "/search";

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
        className="relative z-[110] border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg md:hidden"
      >
        <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
          {browseNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={navLinkClassMobile(isSearch && isBrowseNavActive(type, item))}
            >
              {item.label}
            </Link>
          ))}
          {showSaved ? (
            <Link href="/saved" onClick={onClose} className={navLinkClassMobile(isSaved)}>
              Saved
            </Link>
          ) : null}
          {showAuth && user ? (
            <Link href="/profile" onClick={onClose} className={navLinkClassMobile(isProfile)}>
              Profile
            </Link>
          ) : showAuth ? (
            <Link href="/login" onClick={onClose} className={navLinkClassMobile(pathname === "/login")}>
              Login
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
