import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  images: {
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
  async rewrites() {
    if (!indexNowKey) return [];
    return [
      {
        source: `/${indexNowKey}.txt`,
        destination: "/api/indexnow/key",
      },
    ];
  },
  async redirects() {
    return [
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
