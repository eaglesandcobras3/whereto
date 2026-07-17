import { fetchSitemapEntries } from "@/lib/seo/fetch-sitemap-entries";
import { sitemapEntriesToXml } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 21600;

/** Serves sitemap XML at `/api/sitemap-xml`; public URL is `/sitemap.xml` via rewrite. */
export async function GET() {
  const entries = await fetchSitemapEntries();
  const xml = sitemapEntriesToXml(entries);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
