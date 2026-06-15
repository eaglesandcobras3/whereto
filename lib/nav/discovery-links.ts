import { isAskEnabled, isSearchEnabled, type DiscoveryFlags } from "@/lib/feature-flags-core";
import type { BrowseNavItem } from "@/lib/nav/browse-links";

export type { DiscoveryFlags };

export type DiscoveryLinkParams = {
  q?: string;
  type?: string;
  category?: string;
  town_id?: string;
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
  return isSearchEnabled(flags);
}

export function showNavbarAskUi(flags: DiscoveryFlags): boolean {
  return isAskEnabled(flags);
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

/** Primary discovery URL — `/ask` when ask is on, otherwise `/search`. */
export function discoveryHref(
  flags: DiscoveryFlags,
  params?: DiscoveryLinkParams,
): string {
  if (isAskEnabled(flags)) {
    const q = askQueryFromParams(params);
    if (q) return `/ask?q=${encodeURIComponent(q)}`;
    return "/ask";
  }

  const sp = new URLSearchParams();
  if (params?.q?.trim()) sp.set("q", params.q.trim());
  if (params?.type) sp.set("type", params.type);
  if (params?.category) sp.set("category", params.category);
  if (params?.town_id) sp.set("town_id", params.town_id);
  const qs = sp.toString();
  return qs ? `/search?${qs}` : "/search";
}

export function discoveryLinkRel(href: string): "nofollow" | undefined {
  if (href.startsWith("/search") || href.startsWith("/ask")) return "nofollow";
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
