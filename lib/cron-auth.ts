import { type NextRequest } from "next/server";

/**
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured.
 * Manual runs: same header or `?secret=` for local testing.
 */
export function assertCronAuthorized(request: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    throw new Error("CRON_SECRET is not set");
  }
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const q = request.nextUrl.searchParams.get("secret");
  if (bearer === secret || q === secret) return;
  throw new Error("Unauthorized cron");
}
