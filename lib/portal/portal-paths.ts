/** Portal routes that do not require authentication (invite links must preserve query params through login). */
export const PORTAL_PUBLIC_PATHS = ["/portal/invites/accept"] as const;

export function isPortalProtectedPath(pathname: string): boolean {
  if (!pathname.startsWith("/portal")) return false;
  return !PORTAL_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function portalLoginNextPath(pathname: string, search: string): string {
  return `${pathname}${search}`;
}
