import type { MetadataRoute } from "next";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastMod(value: Date | string | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type SitemapIndexEntry = {
  url: string;
  lastModified?: Date | string;
};

/** Serialize Next.js sitemap entries to Sitemaps 0.9 XML. */
export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastmod = formatLastMod(entry.lastModified);
      const parts = [
        "  <url>",
        `    <loc>${escapeXml(entry.url)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        entry.changeFrequency
          ? `    <changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`
          : "",
        typeof entry.priority === "number"
          ? `    <priority>${entry.priority.toFixed(1)}</priority>`
          : "",
        "  </url>",
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Serialize a sitemap index pointing at child sitemap URLs. */
export function sitemapIndexToXml(entries: SitemapIndexEntry[]): string {
  const sitemaps = entries
    .map((entry) => {
      const lastmod = formatLastMod(entry.lastModified);
      const parts = [
        "  <sitemap>",
        `    <loc>${escapeXml(entry.url)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        "  </sitemap>",
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}\n</sitemapindex>\n`;
}

export function isSitemapIndexXml(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}
