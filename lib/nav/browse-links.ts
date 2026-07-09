/** Primary browse destinations. Used by header + mobile menu. */
export type BrowseNavItem = {
  label: string;
  href: string;
  /** Pathnames that count as active (exact match or prefix for nested routes). */
  activePaths?: string[];
  /** Legacy: `searchParams.get("type")` on `/search` when no dedicated hub exists. */
  activeTypes?: string[];
};

export const BROWSE_NAV_ITEMS: BrowseNavItem[] = [
  { label: "Towns", href: "/towns", activePaths: ["/towns", "/town"] },
  { label: "Areas", href: "/areas", activePaths: ["/areas", "/area"] },
  {
    label: "Businesses",
    href: "/businesses",
    activePaths: ["/businesses", "/business"],
  },
  {
    label: "Services",
    href: "/services",
    activePaths: ["/services"],
    activeTypes: ["services"],
  },
  { label: "Guides", href: "/guides", activePaths: ["/guides", "/guide"] },
];

export function isBrowseNavActive(
  pathname: string,
  type: string | null,
  item: BrowseNavItem,
): boolean {
  if (item.activePaths?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname === "/search" && type && item.activeTypes?.includes(type)) {
    return true;
  }
  return false;
}
