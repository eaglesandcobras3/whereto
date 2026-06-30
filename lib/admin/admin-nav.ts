export type AdminNavItem = {
  href: string;
  title: string;
  description: string;
  /** Hidden when the `onboard` feature flag is off */
  requiresOnboard?: boolean;
  /** Hidden when the `search_inspector` feature flag is off */
  requiresSearchInspector?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin/seo-audit",
    title: "SEO audit",
    description: "Twice-weekly crawl reports: indexability, content, links, schema, sitemaps.",
  },
  {
    title: "Review queue",
    description: "Approve or reject new listings, claims, edits, and photos.",
    requiresOnboard: true,
  },
  {
    href: "/admin/subscriptions",
    title: "Subscriptions",
    description: "Comp Local Partner plans or downgrade without Stripe.",
    requiresOnboard: true,
  },
  {
    href: "/admin/search-debug",
    title: "Search debug",
    description: "Inspect hybrid search results and ranking signals.",
    requiresSearchInspector: true,
  },
];

export function adminNavItemsForSession(flags: {
  onboardEnabled: boolean;
  searchInspectorEnabled: boolean;
}): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.requiresOnboard && !flags.onboardEnabled) return false;
    if (item.requiresSearchInspector && !flags.searchInspectorEnabled) return false;
    return true;
  });
}
