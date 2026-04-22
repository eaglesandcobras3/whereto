/** Primary browse destinations (search with type filter). Used by header + mobile menu. */
export type BrowseNavItem = {
  label: string;
  href: string;
  /** `searchParams.get("type")` values that count as active for this link */
  activeTypes: string[];
};

export const BROWSE_NAV_ITEMS: BrowseNavItem[] = [
  { label: "Towns", href: "/search?type=towns", activeTypes: ["towns"] },
  { label: "Areas", href: "/search?type=areas", activeTypes: ["areas"] },
  {
    label: "Businesses",
    href: "/search?type=businesses",
    activeTypes: ["businesses", "stores"],
  },
  { label: "Services", href: "/search?type=services", activeTypes: ["services"] },
  { label: "Guides", href: "/search?type=guides", activeTypes: ["guides"] },
];

export function isBrowseNavActive(type: string | null, item: BrowseNavItem): boolean {
  if (!type) return false;
  return item.activeTypes.includes(type);
}
