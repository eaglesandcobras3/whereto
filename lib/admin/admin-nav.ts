export type AdminNavItem = {
  href: string;
  title: string;
  description: string;
  /** Hidden when review queue is unavailable (always on now that free intake is ramped) */
  requiresReviewQueue?: boolean;
  /** Hidden when the `onboard` feature flag is off */
  requiresOnboard?: boolean;
  /** Hidden when the `search_inspector` feature flag is off */
  requiresSearchInspector?: boolean;
  /** Hidden when the `community_tips` feature flag is off */
  requiresCommunityTips?: boolean;
  /** Hidden when the `rentals` feature flag is off */
  requiresRentals?: boolean;
  /** Hidden when the `admin_business_direct_edit` feature flag is off */
  requiresAdminBusinessDirectEdit?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin/guides",
    title: "Guides",
    description: "Create, edit, enrich, and publish editorial guides (markdown).",
  },
  {
    href: "/admin/towns",
    title: "Towns",
    description: "Search and edit town destination pages.",
    requiresAdminBusinessDirectEdit: true,
  },
  {
    href: "/admin/areas",
    title: "Areas",
    description: "Search and edit neighborhoods, districts, and POIs.",
    requiresAdminBusinessDirectEdit: true,
  },
  {
    href: "/admin/categories",
    title: "Categories",
    description: "Browse unified business category taxonomy (read-only).",
  },
  {
    href: "/admin/tags",
    title: "Search tags",
    description: "Manage business search tag vocabulary and descriptions.",
  },
  {
    href: "/admin/businesses",
    title: "Businesses",
    description: "Search and edit directory listings directly (no review queue).",
    requiresAdminBusinessDirectEdit: true,
  },
  {
    href: "/admin/add-business",
    title: "Add business",
    description: "Queue new listings, then Apply Gemini verify + import.",
  },
  {
    href: "/admin/irse",
    title: "Index readiness",
    description: "Score pages for Google index readiness; optional GSC inspection + calibration.",
  },
  {
    href: "/admin/rentals",
    title: "Vacation rentals",
    description: "Partners, inventory, and marketplace status.",
    requiresRentals: true,
  },
  {
    href: "/admin/review",
    title: "Review queue",
    description: "Approve or reject free intake, claims, edits, and photos.",
    requiresReviewQueue: true,
  },
  {
    href: "/admin/community-tips",
    title: "Community tips",
    description: "Plant, schedule, approve, hide, or delete visitor tips.",
    requiresCommunityTips: true,
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
  searchInspectorEnabled: boolean;
  communityTipsEnabled?: boolean;
  rentalsEnabled?: boolean;
  adminBusinessDirectEditEnabled?: boolean;
}): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.requiresReviewQueue) return true;
    if (item.requiresOnboard && !flags.onboardEnabled) return false;
    if (item.requiresSearchInspector && !flags.searchInspectorEnabled) return false;
    if (item.requiresCommunityTips && flags.communityTipsEnabled !== true) return false;
    if (item.requiresRentals && flags.rentalsEnabled !== true) return false;
    if (item.requiresAdminBusinessDirectEdit && flags.adminBusinessDirectEditEnabled !== true) {
      return false;
    }
    return true;
  });
}
