import type { MetadataRoute } from "next";
import { getSiteUrl, canonicalSiteHostname } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/profile/",
          "/saved/",
          "/dev/",
          "/_next/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: canonicalSiteHostname(),
  };
}
