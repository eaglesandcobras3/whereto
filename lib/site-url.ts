/** Canonical site origin for sitemaps, robots, Open Graph and metadataBase resolution. */

/**
 * Resolved hostname only (robots.txt `Host` expects a hostname, not `https://...`).
 */
export function canonicalSiteHostname(): string {
  try {
    return new URL(getSiteUrl()).hostname;
  } catch {
    return "localhost";
  }
}

/**
 * Primary site URL fallback order:
 * 1. NEXT_PUBLIC_SITE_URL (set this in prod to your apex or www—you pick one canonical)
 * 2. On **production Vercel** builds: VERCEL_PROJECT_PRODUCTION_URL (primary production hostname)
 * 3. VERCEL_URL (deployment host—often *.vercel.app on previews / misconfigured domains)
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const prodHostRaw = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && prodHostRaw) {
    return `https://${prodHostRaw.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
