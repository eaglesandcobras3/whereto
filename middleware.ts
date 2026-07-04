import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getFeatureFlagsForMiddleware } from "@/lib/feature-flags-resolve";
import { isAskEnabled, isDiscoverEnabled, isOnboardEnabled, isSearchEnabled, isSearchInspectorEnabled } from "@/lib/feature-flags-core";
import {
  categoryDbSlugFromLegacyOn30aSegment,
  categoryHubPath,
} from "@/lib/routes/category-hub-path";
import { businessBrowseGroupFromPublicSegment } from "@/lib/business-categories/browse-group-nav";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { isPortalProtectedPath, portalLoginNextPath } from "@/lib/portal/portal-paths";

/** Legacy `/*-on-30a` category URLs → short canonical paths (e.g. `/restaurants`). */
function maybeRedirectLegacyCategoryOn30a(request: NextRequest): NextResponse | null {
  const segment = request.nextUrl.pathname.replace(/^\//, "").split("/")[0] ?? "";
  const dbSlug = categoryDbSlugFromLegacyOn30aSegment(segment);
  if (!dbSlug || request.nextUrl.pathname.split("/").filter(Boolean).length !== 1) {
    return null;
  }
  return NextResponse.redirect(new URL(categoryHubPath(dbSlug), request.url), 308);
}

/** `/categories/[slug]` → canonical category hub (e.g. `/restaurants`) for granular slugs only. */
function maybeRedirectLegacyCategory(request: NextRequest): NextResponse | null {
  const match = request.nextUrl.pathname.match(/^\/categories\/([^/]+)\/?$/);
  if (!match) return null;
  const segment = match[1] ?? "";
  if (businessBrowseGroupFromPublicSegment(segment)) return null;
  const slug = normalizeBusinessCategorySlug(segment);
  if (!slug) return null;
  return NextResponse.redirect(new URL(categoryHubPath(slug), request.url), 308);
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
      return NextResponse.redirect(new URL(SERVICE_VENDORS_HUB_PATH, request.url));
    }
  }

  if (!hasExtraFilters && !type) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.sb_publishable_key ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let authenticatedUserId: string | undefined;
  let supabase: ReturnType<typeof createServerClient> | undefined;

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    authenticatedUserId = user?.id;
  }

  const flags = await getFeatureFlagsForMiddleware(request, authenticatedUserId);
  const { pathname } = request.nextUrl;

  if (!isAskEnabled(flags) && (pathname === "/ask" || pathname.startsWith("/ask/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isSearchEnabled(flags) && (pathname === "/search" || pathname.startsWith("/search/"))) {
    if (isAskEnabled(flags)) {
      const url = new URL("/ask", request.url);
      const q = request.nextUrl.searchParams.get("q")?.trim();
      if (q) url.searchParams.set("q", q);
      return NextResponse.redirect(url);
    }
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
      pathname === "/admin/review" ||
      pathname.startsWith("/api/admin/review") ||
      pathname === "/admin/subscriptions" ||
      pathname.startsWith("/api/admin/subscriptions") ||
      pathname.startsWith("/api/admin/businesses"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isSearchInspectorEnabled(flags) &&
    (pathname === "/admin/search-debug" || pathname.startsWith("/admin/search-debug/"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const legacyOn30aRedirect = maybeRedirectLegacyCategoryOn30a(request);
  if (legacyOn30aRedirect) return legacyOn30aRedirect;

  const legacyCategoryRedirect = maybeRedirectLegacyCategory(request);
  if (legacyCategoryRedirect) return legacyCategoryRedirect;

  const searchRedirect = maybeRedirectSearch(request);
  if (searchRedirect) return searchRedirect;

  if (!supabase) {
    return supabaseResponse;
  }

  if (isOnboardEnabled(flags) && isPortalProtectedPath(pathname)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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
