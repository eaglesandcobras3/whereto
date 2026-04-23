import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getFeatureFlagsForEdgeRequest,
  isAuthEnabled,
  isSavedEnabled,
} from "@/lib/feature-flags-core";

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
