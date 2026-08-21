import {
  isAskEnabled,
  isDiscoverEnabled,
  isDiscoverNlEnabled,
  type DiscoveryFlags,
  type FeatureFlags,
} from "@/lib/feature-flags-core";
import { buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import type { BrowseNavItem } from "@/lib/nav/browse-links";

export type { DiscoveryFlags };

export type DiscoveryLinkParams = {
  q?: string;
  type?: string;
  category?: string;
  town_id?: string;
  town?: string;
  service_category?: string;
  facet?: string;
  area_id?: string;
};

const TYPE_ASK_QUERIES: Record<string, string> = {
  services: "services and vendors on 30A",
  events: "events on 30A",
  access: "public beach access and landmarks on 30A",
  guides: "travel guides and local tips for 30A",
  businesses: "businesses on 30A",
};

export function showNavbarSearchUi(flags: DiscoveryFlags): boolean {
  void flags;
  return false;
}

export function showNavbarDiscoverUi(flags: FeatureFlags): boolean {
  if (isAskEnabled(flags)) return false;
  return isDiscoverEnabled(flags);
}

/**
 * Expandable navbar natural-language query panel.
 * Gated by PostHog `discover_nl` (requires `discover`), not by `discover` alone.
 */
export function showNavbarDiscoverQueryUi(flags: FeatureFlags): boolean {
  if (isAskEnabled(flags)) return false;
  return isDiscoverNlFeatureEnabled(flags);
}

export function showNavbarAskUi(flags: DiscoveryFlags): boolean {
  return isAskEnabled(flags);
}

/** Any discovery product enabled (search, ask, or discover). */
export function isDiscoveryEnabled(flags: DiscoveryFlags | FeatureFlags): boolean {
  return (
    isAskEnabled(flags) ||
    isDiscoverEnabled(flags as FeatureFlags)
  );
}

function askQueryFromParams(params?: DiscoveryLinkParams): string | undefined {
  if (params?.q?.trim()) return params.q.trim();
  if (params?.type && TYPE_ASK_QUERIES[params.type]) {
    return TYPE_ASK_QUERIES[params.type];
  }
  if (params?.category) {
    const cat = params.category.replace(/_/g, " ");
    return `Find ${cat} on 30A`;
  }
  return undefined;
}

/** Filter-first discovery (`/discover`) — separate from legacy `/search`. */
export function discoverHref(flags: FeatureFlags, params?: DiscoveryLinkParams): string {
  if (!isDiscoverEnabled(flags)) return "/";

  return buildDiscoverUrlFromLinkParams({
    type: params?.type,
    town: params?.town,
    town_id: params?.town_id,
    category: params?.category,
    service_category: params?.service_category,
    facet: params?.facet,
    q: params?.q,
  });
}

/** PostHog `discover_nl` (requires `discover`) or local dev bypass. */
export function isDiscoverNlFeatureEnabled(flags: FeatureFlags): boolean {
  return isDiscoverNlEnabled(flags) || discoverNlDevBypassEnabled();
}

function discoverNlDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DISCOVER_NL_ENABLED === "1";
}

/** Primary discovery URL — `/discover` when discover is on, else `/ask`. */
export function discoveryHref(
  flags: DiscoveryFlags,
  params?: DiscoveryLinkParams,
): string {
  if (isDiscoverEnabled(flags as FeatureFlags)) {
    return discoverHref(flags as FeatureFlags, params);
  }

  if (isAskEnabled(flags)) {
    const q = askQueryFromParams(params);
    if (q) return `/ask?q=${encodeURIComponent(q)}`;
    return "/ask";
  }

  return "/";
}

export function discoveryLinkRel(href: string): "nofollow" | undefined {
  if (href.startsWith("/search") || href.startsWith("/ask") || href.startsWith("/discover")) {
    return "nofollow";
  }
  return undefined;
}

export function applyDiscoveryBrowseNav(
  items: BrowseNavItem[],
  flags: DiscoveryFlags | FeatureFlags,
): BrowseNavItem[] {
  const discoverOn =
    "discover" in flags && isDiscoverEnabled(flags as FeatureFlags);
  const askOn = isAskEnabled(flags);

  if (!discoverOn && !askOn) return items;

  const next: BrowseNavItem[] = [];

  for (const item of items) {
    if (discoverOn && item.href === "/businesses") {
      next.push({
        ...item,
        href: discoverHref(flags as FeatureFlags),
        activePaths: Array.from(
          new Set([
            ...(item.activePaths ?? []).filter(
              (path) => path !== "/businesses" && path !== "/categories" && path !== "/services",
            ),
            "/discover",
          ]),
        ),
      });
      if (!items.some((i) => i.label === "Categories") && !next.some((i) => i.label === "Categories")) {
        next.push({
          label: "Categories",
          href: "/businesses",
          activePaths: ["/businesses", "/services", "/categories"],
        });
      }
      continue;
    }

    if (!askOn || !item.href.startsWith("/search")) {
      next.push(item);
      continue;
    }
    try {
      const url = new URL(item.href, "http://local");
      const type = url.searchParams.get("type") ?? undefined;
      next.push({
        ...item,
        href: discoveryHref(flags, { type }),
      });
    } catch {
      next.push({ ...item, href: "/ask" });
    }
  }

  return next;
}

/** Insert Stays browse link when rentals marketplace flag is on. */
export function applyRentalsBrowseNav(
  items: BrowseNavItem[],
  rentalsEnabled: boolean,
): BrowseNavItem[] {
  if (!rentalsEnabled) return items;
  if (items.some((i) => i.href === "/stays")) return items;
  const staysItem: BrowseNavItem = {
    label: "Stays",
    href: "/stays",
    activePaths: ["/stays"],
  };
  const guidesIdx = items.findIndex((i) => i.href === "/guides");
  if (guidesIdx >= 0) {
    const next = [...items];
    next.splice(guidesIdx, 0, staysItem);
    return next;
  }
  return [...items, staysItem];
}
