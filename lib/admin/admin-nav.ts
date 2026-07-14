export type AdminNavItem = {
  href: string;
  title: string;
  description: string;
  /** Hidden when neither `onboard` nor `free_onboard` is on */
  requiresReviewQueue?: boolean;
  /** Hidden when the `onboard` feature flag is off */
  requiresOnboard?: boolean;
  /** Hidden when the `search_inspector` feature flag is off */
  requiresSearchInspector?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin/guides",
    title: "Guides",
    description: "Create, edit, enrich, and publish editorial guides (markdown).",
  },
  {
    href: "/admin/seo-audit",
    title: "SEO audit",
    description: "Optional stored reports; run npm run audit:seo -- --live for full markdown.",
  },
  {
    href: "/admin/review",
    title: "Review queue",
    description: "Approve or reject free intake, claims, edits, and photos.",
    requiresReviewQueue: true,
  },
  {
    href: "/admin/subscriptions",
    title: "Subscriptions",
    description: "Comp Local Partner plans or downgrade without Stripe.",
    requiresOnboard: true,
  },
  {
    href: "/admin/discover-gaps",
    title: "Discover search gaps",
    description: "Unresolved discover NL terms — grow tags and listing coverage.",
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
  freeOnboardEnabled?: boolean;
  searchInspectorEnabled: boolean;
}): AdminNavItem[] {
  const reviewEnabled = flags.onboardEnabled || flags.freeOnboardEnabled === true;
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.requiresReviewQueue && !reviewEnabled) return false;
    if (item.requiresOnboard && !flags.onboardEnabled) return false;
    if (item.requiresSearchInspector && !flags.searchInspectorEnabled) return false;
    return true;
  });
}
