"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BROWSE_NAV_ITEMS, isBrowseNavActive } from "@/lib/nav/browse-links";

function navLinkClass(active: boolean) {
  const base =
    "inline-flex items-center px-2.5 py-2 text-sm font-semibold tracking-tight font-headline border-b-2 transition-premium-fast md:px-3";
  return active
    ? `${base} text-[var(--color-primary)] border-[var(--color-primary)]`
    : `${base} text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-outline-variant)] hover:text-[var(--color-primary)]`;
}

export function NavbarCategoryLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const isSearch = pathname === "/search";

  return (
    <div className="hidden min-w-0 shrink-0 flex-nowrap items-center gap-0.5 overflow-x-auto scrollbar-hide md:flex md:max-w-none md:gap-1">
      {BROWSE_NAV_ITEMS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={navLinkClass(isSearch && isBrowseNavActive(type, item))}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
