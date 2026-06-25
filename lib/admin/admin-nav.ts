export type AdminNavItem = {
  href: string;
  title: string;
  description: string;
  /** Hidden when the `onboard` feature flag is off */
  requiresOnboard?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin/review",
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
  },
];

export function adminNavItemsForSession(onboardEnabled: boolean): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => !item.requiresOnboard || onboardEnabled);
}
