import { getSiteUrl } from "@/lib/site-url";
import {
  SITEMAP_BUSINESSES_PATH,
  SITEMAP_HUBS_PATH,
} from "@/lib/seo/sitemap-strategy";
import { sitemapIndexToXml } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 21600;

const SITEMAP_CACHE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
} as const;

/** Sitemap index at `/sitemap.xml` referencing hub and business child sitemaps. */
export async function GET() {
  const base = getSiteUrl();
  const now = new Date();
  const xml = sitemapIndexToXml([
    { url: `${base}${SITEMAP_HUBS_PATH}`, lastModified: now },
    { url: `${base}${SITEMAP_BUSINESSES_PATH}`, lastModified: now },
  ]);
  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
