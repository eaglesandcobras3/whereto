import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getFeatureFlagsForMiddleware } from "@/lib/feature-flags-resolve";
import {
  isAskEnabled,
  isDiscoverEnabled,
  isOnboardEnabled,
  isRentalPartnersEnabled,
  isRentalsEnabled,
  isReviewQueueEnabled,
  isSearchInspectorEnabled,
} from "@/lib/feature-flags-core";
import { buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import {
  categoryDbSlugFromLegacyOn30aSegment,
  categoryHubPath,
  isLegacyRootCategorySegment,
} from "@/lib/routes/category-hub-path";
import { businessBrowseGroupFromPublicSegment } from "@/lib/business-categories/browse-group-nav";
import { unifiedRollupFromPublicSegment } from "@/lib/categories/unified-browse";
import { isPortalProtectedPath, portalLoginNextPath } from "@/lib/portal/portal-paths";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";

function pathnameNeedsFeatureFlags(pathname: string): boolean {
  if (pathname === "/ask" || pathname.startsWith("/ask/")) return true;
  if (pathname === "/discover" || pathname.startsWith("/discover/")) return true;
  if (pathname === "/api/discovery" || pathname.startsWith("/api/discovery/")) return true;
  if (pathname === "/list-your-business") return true;
  if (pathname === "/stays" || pathname.startsWith("/stays/")) return true;
  if (pathname === "/list-your-rentals" || pathname.startsWith("/list-your-rentals/")) return true;
  if (pathname === "/api/stays" || pathname.startsWith("/api/stays/")) return true;
  if (pathname === "/api/rentals" || pathname.startsWith("/api/rentals/")) return true;
  if (pathname === "/admin/rentals" || pathname.startsWith("/admin/rentals/")) return true;
  if (pathname.startsWith("/api/admin/rentals")) return true;
  if (pathname === "/portal" || pathname.startsWith("/portal/")) return true;
  if (pathname.startsWith("/api/portal/")) return true;
  if (pathname === "/admin/review" || pathname.startsWith("/api/admin/review")) return true;
  if (pathname === "/admin/subscriptions" || pathname.startsWith("/api/admin/subscriptions")) {
    return true;
  }
  if (pathname.startsWith("/api/admin/businesses")) return true;
  if (pathname === "/admin/search-debug" || pathname.startsWith("/admin/search-debug/")) {
    return true;
  }
  return false;
}

/** Legacy `/*-on-30a` category URLs → `/businesses/...`. */
function maybeRedirectLegacyCategoryOn30a(request: NextRequest): NextResponse | null {
  const segment = request.nextUrl.pathname.replace(/^\//, "").split("/")[0] ?? "";
  const dbSlug = categoryDbSlugFromLegacyOn30aSegment(segment);
  if (!dbSlug || request.nextUrl.pathname.split("/").filter(Boolean).length !== 1) {
    return null;
  }
  return NextResponse.redirect(new URL(categoryHubPath(dbSlug), request.url), 308);
}

/** `/categories/[slug]` → `/businesses/[slug]` (rollups + leaves). */
function maybeRedirectLegacyCategory(request: NextRequest): NextResponse | null {
  const match = request.nextUrl.pathname.match(/^\/categories\/([^/]+)\/?$/);
  if (!match) return null;
  const segment = (match[1] ?? "").trim().toLowerCase();
  if (!segment) {
    return NextResponse.redirect(new URL("/businesses", request.url), 308);
  }
  return NextResponse.redirect(new URL(`/businesses/${segment}`, request.url), 308);
}

/** Root `/bars` (etc.) → `/businesses/bars` for former category hub URLs. */
function maybeRedirectRootCategoryHub(request: NextRequest): NextResponse | null {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return null;
  const segment = parts[0]!.toLowerCase();
  if (isReservedRootSlug(segment)) return null;
  if (
    isLegacyRootCategorySegment(segment) ||
    businessBrowseGroupFromPublicSegment(segment) ||
    unifiedRollupFromPublicSegment(segment)
  ) {
    return NextResponse.redirect(new URL(`/businesses/${segment}`, request.url), 308);
  }
  return null;
}

/** Server-side redirects for legacy /search URLs — avoids 200 HTML + client meta refresh. */
function maybeRedirectSearch(request: NextRequest): NextResponse | null {
  if (request.nextUrl.pathname !== "/search") return null;

  const sp = request.nextUrl.searchParams;
  const legacySpecialty = sp.get("service_category")?.trim();
  if (legacySpecialty && !sp.get("specialty")?.trim()) {
    const url = request.nextUrl.clone();
    url.searchParams.set("specialty", legacySpecialty);
    url.searchParams.delete("service_category");
    return NextResponse.redirect(url, 308);
  }

  const rawType = sp.get("type");
  const type = rawType === "stores" ? "businesses" : rawType;

  const hasExtraFilters = Boolean(
    sp.get("q")?.trim() ||
      sp.get("town_id")?.trim() ||
      sp.get("category")?.trim() ||
      sp.get("specialty")?.trim() ||
      sp.get("service_category")?.trim() ||
      sp.get("area_id")?.trim() ||
      sp.get("scope") ||
      sp.get("price") ||
      sp.get("tags") ||
      (sp.get("page")?.trim() && sp.get("page") !== "1") ||
      sp.get("sort")?.trim(),
  );

  if (!hasExtraFilters && type) {
    if (type === "towns") return NextResponse.redirect(new URL("/towns", request.url));
    if (type === "areas") return NextResponse.redirect(new URL("/areas", request.url));
    if (type === "businesses") return NextResponse.redirect(new URL("/businesses", request.url));
    if (type === "guides") return NextResponse.redirect(new URL("/guides", request.url));
    if (type === "services") {
      return NextResponse.redirect(new URL("/businesses", request.url));
    }
  }

  if (!hasExtraFilters && !type) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const specialty = sp.get("specialty")?.trim() || sp.get("service_category")?.trim() || undefined;
  const discoverTarget = buildDiscoverUrlFromLinkParams({
    type:
      type === "services"
        ? "services"
        : type === "businesses"
          ? "storefront"
          : undefined,
    town_id: sp.get("town_id")?.trim() || undefined,
    category: sp.get("category")?.trim() || undefined,
    service_category: specialty,
    facet: sp.get("tags")?.trim() || undefined,
    q: sp.get("q")?.trim() || undefined,
    page: Number(sp.get("page") || "1"),
  });

  return NextResponse.redirect(new URL(discoverTarget, request.url), 308);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyOn30aRedirect = maybeRedirectLegacyCategoryOn30a(request);
  if (legacyOn30aRedirect) return legacyOn30aRedirect;

  const legacyCategoryRedirect = maybeRedirectLegacyCategory(request);
  if (legacyCategoryRedirect) return legacyCategoryRedirect;

  const rootCategoryRedirect = maybeRedirectRootCategoryHub(request);
  if (rootCategoryRedirect) return rootCategoryRedirect;

  const searchRedirect = maybeRedirectSearch(request);
  if (searchRedirect) return searchRedirect;

  const needsFlags = pathnameNeedsFeatureFlags(pathname);
  const needsAuth = isPortalProtectedPath(pathname);

  if (!needsFlags && !needsAuth) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.sb_publishable_key ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabase: ReturnType<typeof createServerClient> | undefined;
  let authenticatedUserId: string | undefined;
  let portalUser: { id: string } | null = null;

  if (supabaseUrl && supabaseKey) {
    supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    if (needsAuth) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      portalUser = user;
      authenticatedUserId = user?.id;
    }
  }

  const flags = await getFeatureFlagsForMiddleware(request, authenticatedUserId);

  if (!isAskEnabled(flags) && (pathname === "/ask" || pathname.startsWith("/ask/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const discoverDevBypass =
    process.env.NODE_ENV === "development" && process.env.DISCOVER_ENABLED === "1";
  if (
    !isDiscoverEnabled(flags) &&
    !discoverDevBypass &&
    (pathname === "/discover" || pathname.startsWith("/discover/"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    !isDiscoverEnabled(flags) &&
    !discoverDevBypass &&
    (pathname === "/api/discovery" || pathname.startsWith("/api/discovery/"))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !isOnboardEnabled(flags) &&
    (pathname === "/portal" ||
      pathname.startsWith("/portal/") ||
      pathname.startsWith("/api/portal/") ||
      pathname === "/admin/subscriptions" ||
      pathname.startsWith("/api/admin/subscriptions"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    !isReviewQueueEnabled(flags) &&
    (pathname === "/admin/review" || pathname.startsWith("/api/admin/review"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    !isSearchInspectorEnabled(flags) &&
    (pathname === "/admin/search-debug" || pathname.startsWith("/admin/search-debug/"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const rentalsDevBypass =
    process.env.NODE_ENV === "development" && process.env.RENTALS_ENABLED === "1";
  const rentalsOn = isRentalsEnabled(flags) || rentalsDevBypass;
  const rentalPartnersDevBypass =
    process.env.NODE_ENV === "development" && process.env.RENTAL_PARTNERS_ENABLED === "1";
  const rentalPartnersOn = isRentalPartnersEnabled(flags) || rentalPartnersDevBypass;

  const isPartnerApplicationPath =
    pathname === "/list-your-rentals/partner" ||
    pathname.startsWith("/list-your-rentals/partner/");
  const isPartnerApplicationApi =
    pathname === "/api/rentals/partner-application" ||
    pathname.startsWith("/api/rentals/partner-application/");

  if (
    !rentalsOn &&
    (pathname === "/stays" ||
      pathname.startsWith("/stays/") ||
      pathname === "/admin/rentals" ||
      pathname.startsWith("/admin/rentals/") ||
      (pathname === "/list-your-rentals" && !isPartnerApplicationPath) ||
      (pathname.startsWith("/list-your-rentals/") && !isPartnerApplicationPath))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!rentalPartnersOn && isPartnerApplicationPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (
    !rentalsOn &&
    (pathname === "/api/stays" ||
      pathname.startsWith("/api/stays/") ||
      pathname.startsWith("/api/admin/rentals") ||
      ((pathname === "/api/rentals" || pathname.startsWith("/api/rentals/")) &&
        !isPartnerApplicationApi))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!rentalPartnersOn && isPartnerApplicationApi) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!supabase) {
    return supabaseResponse;
  }

  if (isOnboardEnabled(flags) && needsAuth) {
    if (!portalUser) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", portalLoginNextPath(pathname, request.nextUrl.search));
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)",
  ],
};
