import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
import { retiredGuideRedirectRules } from "./lib/seo/retired-guide-redirects";
import { LEGACY_BROWSE_GROUP_REDIRECTS } from "./lib/seo/legacy-browse-group-redirects";

const supabaseHost = (() => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) return null;
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
})();

const indexNowKey = process.env.INDEXNOW_KEY?.trim();

// Derive PostHog ingest and assets hosts from the env var.
// e.g. https://us.i.posthog.com → ingest host; https://us-assets.i.posthog.com → assets host
const phIngestHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
const phAssetsHost = phIngestHost
  ? phIngestHost.replace("://us.i.", "://us-assets.i.").replace("://eu.i.", "://eu-assets.i.")
  : undefined;

const nextConfig: NextConfig = {
  // mjml pulls Node-only tooling; keep it external for server bundles.
  serverExternalPackages: ["mjml"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const rules: { source: string; destination: string }[] = [
      // Avoid `app/[townSlug]` capturing `/sitemap.xml` (production 404).
      { source: "/sitemap.xml", destination: "/api/sitemap-xml" },
      { source: "/llms.txt", destination: "/api/llms-txt" },
      // PostHog reverse proxy — routes ingest through Next.js to avoid ad blockers.
      ...(phAssetsHost ? [
        { source: "/ingest/static/:path*", destination: `${phAssetsHost}/static/:path*` },
        { source: "/ingest/array/:path*", destination: `${phAssetsHost}/array/:path*` },
      ] : []),
      ...(phIngestHost ? [
        { source: "/ingest/:path*", destination: `${phIngestHost}/:path*` },
      ] : []),
    ];
    if (indexNowKey) {
      rules.push({
        source: `/${indexNowKey}.txt`,
        destination: "/api/indexnow/key",
      });
    }
    return rules;
  },
  async redirects() {
    return [
      ...retiredGuideRedirectRules(),
      ...LEGACY_BROWSE_GROUP_REDIRECTS.map((r) => ({
        source: r.source,
        destination: r.destination,
        permanent: true,
      })),
      {
        source: "/guide",
        destination: "/guide/ultimate-30a-first-timers-guide",
        statusCode: 301,
      },
      {
        source: "/favicon.ico",
        destination: "/favicon.svg",
        permanent: false,
      },
      {
        source: "/30a",
        destination: "/towns",
        permanent: true,
      },
      {
        // Combined directory: former services hub redirects to businesses.
        source: "/services",
        destination: "/businesses",
        permanent: true,
      },
      {
        source: "/services/:path*",
        destination: "/businesses",
        permanent: true,
      },
      {
        // Taxonomy index merged into businesses hub; rollup + leaf pages live at /businesses/[slug].
        source: "/categories",
        destination: "/businesses",
        permanent: true,
      },
      {
        source: "/categories/:slug",
        destination: "/businesses/:slug",
        permanent: true,
      },
      {
        // Retired Option A catch-all; specialties now live in named groups.
        source: "/services/marine-auto-more",
        destination: "/businesses",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withWorkflow(nextConfig);
