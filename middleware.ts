import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getFeatureFlagsForEdgeRequest,
  isAskEnabled,
  isAuthEnabled,
  isSavedEnabled,
} from "@/lib/feature-flags-core";
import {
  categoryDbSlugFromLegacyOn30aSegment,
  categoryHubPath,
} from "@/lib/routes/category-hub-path";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";

function isAuthGatedPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/signup" || pathname.startsWith("/signup/")) return true;
  if (pathname === "/forgot-password" || pathname.startsWith("/forgot-password/"))
    return true;
  if (pathname === "/reset-password" || pathname.startsWith("/reset-password/"))
    return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/auth/callback" || pathname.startsWith("/auth/")) return true;
  return false;
}

/** Legacy `/*-on-30a` category URLs → short canonical paths (e.g. `/restaurants`). */
function maybeRedirectLegacyCategoryOn30a(request: NextRequest): NextResponse | null {
  const segment = request.nextUrl.pathname.replace(/^\//, "").split("/")[0] ?? "";
  const dbSlug = categoryDbSlugFromLegacyOn30aSegment(segment);
  if (!dbSlug || request.nextUrl.pathname.split("/").filter(Boolean).length !== 1) {
    return null;
  }
  return NextResponse.redirect(new URL(categoryHubPath(dbSlug), request.url), 308);
}

/** `/categories/[slug]` → canonical category hub (e.g. `/restaurants`). */
function maybeRedirectLegacyCategory(request: NextRequest): NextResponse | null {
  const match = request.nextUrl.pathname.match(/^\/categories\/([^/]+)\/?$/);
  if (!match) return null;
  const slug = normalizeBusinessCategorySlug(match[1]);
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
  const flags = getFeatureFlagsForEdgeRequest((name) =>
    request.cookies.get(name)?.value,
  );
  const { pathname } = request.nextUrl;

  if (!isAuthEnabled(flags) && isAuthGatedPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (
    !isSavedEnabled(flags) &&
    (pathname === "/saved" || pathname.startsWith("/saved/"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!isAskEnabled(flags) && (pathname === "/ask" || pathname.startsWith("/ask/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const legacyOn30aRedirect = maybeRedirectLegacyCategoryOn30a(request);
  if (legacyOn30aRedirect) return legacyOn30aRedirect;

  const legacyCategoryRedirect = maybeRedirectLegacyCategory(request);
  if (legacyCategoryRedirect) return legacyCategoryRedirect;

  const searchRedirect = maybeRedirectSearch(request);
  if (searchRedirect) return searchRedirect;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.sb_publishable_key ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session - this is required for Server Components to read the session
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
