import { fetchSitemapEntries } from "@/lib/seo/fetch-sitemap-entries";
import { sitemapEntriesToXml } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 21600;

const SITEMAP_CACHE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
} as const;

/** Hub/editorial sitemap at `/sitemap-hubs.xml` (child of `/sitemap.xml` index). */
export async function GET() {
  const entries = await fetchSitemapEntries();
  const xml = sitemapEntriesToXml(entries);
  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
