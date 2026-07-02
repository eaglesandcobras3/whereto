import { isAskEnabled, isDiscoverEnabled, isSearchEnabled, type DiscoveryFlags, type FeatureFlags } from "@/lib/feature-flags-core";
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
  if (isAskEnabled(flags)) return false;
  if (isDiscoverEnabled(flags as FeatureFlags)) return false;
  return isSearchEnabled(flags);
}

export function showNavbarDiscoverUi(flags: FeatureFlags): boolean {
  if (isAskEnabled(flags)) return false;
  return isDiscoverEnabled(flags);
}

export function showNavbarAskUi(flags: DiscoveryFlags): boolean {
  return isAskEnabled(flags);
}

/** Hub hero search bars and other discovery entry points (search, discover, or ask). */
export function showHubDiscoveryUi(flags: DiscoveryFlags): boolean {
  return isAskEnabled(flags) || isSearchEnabled(flags) || isDiscoverEnabled(flags as FeatureFlags);
}

export function isDiscoveryEnabled(flags: DiscoveryFlags): boolean {
  return showHubDiscoveryUi(flags);
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

  const sp = new URLSearchParams();
  if (params?.town?.trim()) sp.set("town", params.town.trim());
  else if (params?.town_id?.trim()) sp.set("town_id", params.town_id.trim());
  if (params?.type === "services") sp.set("type", "services");
  else if (params?.type === "storefront" || params?.type === "businesses") sp.set("type", "storefront");
  if (params?.category?.trim()) sp.set("category", params.category.trim());
  if (params?.service_category?.trim()) sp.set("service_category", params.service_category.trim());
  if (params?.facet?.trim()) sp.set("facet", params.facet.trim());
  if (params?.q?.trim()) sp.set("q", params.q.trim());
  const qs = sp.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

/** Primary discovery URL — `/discover` when discover is on, else `/ask` or `/search`. */
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

  if (!isSearchEnabled(flags)) return "/";

  const sp = new URLSearchParams();
  if (params?.q?.trim()) sp.set("q", params.q.trim());
  if (params?.type) sp.set("type", params.type);
  if (params?.category) sp.set("category", params.category);
  if (params?.town_id) sp.set("town_id", params.town_id);
  if (params?.area_id) sp.set("area_id", params.area_id);
  const qs = sp.toString();
  return qs ? `/search?${qs}` : "/search";
}

export function discoveryLinkRel(href: string): "nofollow" | undefined {
  if (href.startsWith("/search") || href.startsWith("/ask") || href.startsWith("/discover")) {
    return "nofollow";
  }
  return undefined;
}

export function applyDiscoveryBrowseNav(
  items: BrowseNavItem[],
  flags: DiscoveryFlags,
): BrowseNavItem[] {
  if (!isAskEnabled(flags)) return items;

  return items.map((item) => {
    if (!item.href.startsWith("/search")) return item;
    try {
      const url = new URL(item.href, "http://local");
      const type = url.searchParams.get("type") ?? undefined;
      return {
        ...item,
        href: discoveryHref(flags, { type }),
      };
    } catch {
      return { ...item, href: "/ask" };
    }
  });
}
