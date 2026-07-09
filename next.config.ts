import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
import { retiredGuideRedirectRules } from "./lib/seo/retired-guide-redirects";

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
      // Avoid `app/[townSlug]` capturing sitemap routes (production 404).
      { source: "/sitemap.xml", destination: "/api/sitemap-xml" },
      { source: "/sitemap-hubs.xml", destination: "/api/sitemap-hubs-xml" },
      { source: "/sitemap-businesses.xml", destination: "/api/sitemap-businesses-xml" },
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
