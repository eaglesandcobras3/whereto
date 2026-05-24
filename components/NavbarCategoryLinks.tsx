"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BROWSE_NAV_ITEMS, isBrowseNavActive, type BrowseNavItem } from "@/lib/nav/browse-links";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

function navLinkClass(active: boolean) {
  const base =
    "inline-flex items-center px-2.5 py-2 text-sm font-semibold tracking-tight font-headline border-b-2 transition-premium-fast md:px-3";
  return active
    ? `${base} text-[var(--color-logo-navy)] border-[var(--color-logo-navy)]`
    : `${base} text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-logo-navy)] hover:text-[var(--color-logo-navy)]`;
}

type Props = {
  items?: BrowseNavItem[];
};

export function NavbarCategoryLinks({ items = BROWSE_NAV_ITEMS }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const isSearch = pathname === "/search";

  return (
    <div className="hidden min-w-0 shrink-0 flex-nowrap items-center gap-0.5 overflow-x-auto scrollbar-hide md:flex md:max-w-none md:gap-1">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          {...gaClickProps({
            event: "nav_click",
            category: "header_browse",
            label: item.label.replace(/\s+/g, "_").toLowerCase(),
          })}
          className={navLinkClass(isSearch && isBrowseNavActive(type, item))}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
