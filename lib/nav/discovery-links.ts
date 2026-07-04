import {
  isAskEnabled,
  isDiscoverEnabled,
  isDiscoverNlEnabled,
  isSearchEnabled,
  type DiscoveryFlags,
  type FeatureFlags,
} from "@/lib/feature-flags-core";
import { buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import {
  hasExplicitDiscoverParams,
  parseDiscoverQuery,
} from "@/lib/discovery-filters/parse-discover-query";
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

/** Any discovery product enabled (search, ask, or discover). */
export function isDiscoveryEnabled(flags: DiscoveryFlags | FeatureFlags): boolean {
  return (
    isAskEnabled(flags) ||
    isSearchEnabled(flags) ||
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

  const effectiveParams = expandDiscoverParamsIfNl(flags, params);

  return buildDiscoverUrlFromLinkParams({
    type: effectiveParams?.type,
    town: effectiveParams?.town,
    town_id: effectiveParams?.town_id,
    category: effectiveParams?.category,
    service_category: effectiveParams?.service_category,
    facet: effectiveParams?.facet,
    q: effectiveParams?.q,
  });
}

function expandDiscoverParamsIfNl(
  flags: FeatureFlags,
  params?: DiscoveryLinkParams,
): DiscoveryLinkParams | undefined {
  if (!isDiscoverNlFeatureEnabled(flags)) return params;
  if (!params?.q?.trim()) return params;
  if (hasExplicitDiscoverParams(params)) return params;

  const parsed = parseDiscoverQuery(params.q);
  if (!parsed.expanded) return params;

  const next: DiscoveryLinkParams = {};
  if (parsed.type) next.type = parsed.type;
  if (parsed.town) next.town = parsed.town;
  else if (params.town_id) next.town_id = params.town_id;
  if (parsed.category) next.category = parsed.category;
  if (parsed.service_category) next.service_category = parsed.service_category;
  if (parsed.facet) next.facet = parsed.facet;
  if (parsed.q) next.q = parsed.q;
  return next;
}

/** PostHog `discover_nl` (requires `discover`) or local dev bypass. */
export function isDiscoverNlFeatureEnabled(flags: FeatureFlags): boolean {
  return isDiscoverNlEnabled(flags) || discoverNlDevBypassEnabled();
}

function discoverNlDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DISCOVER_NL_ENABLED === "1";
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
