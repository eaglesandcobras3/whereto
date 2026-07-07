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
          // Utility / session surfaces (also noindex in page metadata)
          "/search",
          "/ask",
          "/discover",
          "/feedback",
          "/list-your-business",
          "/share/",
          // Auth flows — not indexable landing pages
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
