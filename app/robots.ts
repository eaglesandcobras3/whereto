import type { MetadataRoute } from "next";
import { getSiteUrl, canonicalSiteHostname } from "@/lib/site-url";

/**
 * AI crawlers (GPTBot, ChatGPT-User, CCBot) inherit the same allow/disallow
 * rules as `*` so they can read public guides/towns/businesses — matching
 * the discovery intent of `/llms.txt`. Private/utility paths stay blocked.
 */
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
          "/list-your-rentals",
          "/share/",
          // Auth flows — not indexable landing pages
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: canonicalSiteHostname(),
  };
}
