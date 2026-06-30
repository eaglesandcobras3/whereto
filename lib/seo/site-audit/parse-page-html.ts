import type { ParsedPageHtml } from "./types";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = re.exec(tag);
  return m?.[1]?.trim() ?? null;
}

function metaContent(tag: string): string | null {
  return attrValue(tag, "content");
}

function metaName(tag: string): string | null {
  return attrValue(tag, "name") ?? attrValue(tag, "property");
}

export function extractLinksFromHtml(html: string, baseUrl: string): { internal: string[]; external: string[] } {
  const internal: string[] = [];
  const external: string[] = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"'#][^"']*)["']/gi;
  let m: RegExpExecArray | null;
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return { internal, external };
  }

  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
      continue;
    }
    try {
      const resolved = new URL(raw, baseUrl);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;
      resolved.hash = "";
      const normalized = resolved.toString().replace(/\/$/, "");
      if (resolved.hostname === base.hostname) {
        internal.push(normalized);
      } else {
        external.push(normalized);
      }
    } catch {
      // skip invalid
    }
  }

  return { internal, external };
}

export function parsePageHtml(html: string, pageUrl: string): ParsedPageHtml {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, " ").trim()) : null;

  let metaDescription: string | null = null;
  let robotsMeta: string | null = null;
  let ogTitle: string | null = null;
  let ogDescription: string | null = null;
  let ogImage: string | null = null;
  let ogUrl: string | null = null;
  let twitterCard: string | null = null;
  let twitterTitle: string | null = null;
  let twitterImage: string | null = null;

  const metaRe = /<meta\s[^>]*>/gi;
  let meta: RegExpExecArray | null;
  while ((meta = metaRe.exec(html)) !== null) {
    const tag = meta[0];
    const name = metaName(tag)?.toLowerCase();
    const content = metaContent(tag);
    if (!name || content == null) continue;
    if (name === "description") metaDescription = decodeHtmlEntities(content.trim());
    if (name === "robots") robotsMeta = content.trim().toLowerCase();
    if (name === "og:title") ogTitle = decodeHtmlEntities(content.trim());
    if (name === "og:description") ogDescription = decodeHtmlEntities(content.trim());
    if (name === "og:image") ogImage = content.trim();
    if (name === "og:url") ogUrl = content.trim();
    if (name === "twitter:card") twitterCard = content.trim();
    if (name === "twitter:title") twitterTitle = decodeHtmlEntities(content.trim());
    if (name === "twitter:image") twitterImage = content.trim();
  }

  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]*>/i,
  );
  const canonicalHref = canonicalMatch ? attrValue(canonicalMatch[0], "href") : null;

  const h1Texts: string[] = [];
  const h1Re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let h1: RegExpExecArray | null;
  while ((h1 = h1Re.exec(html)) !== null) {
    const text = stripTags(h1[1]);
    if (text) h1Texts.push(text);
  }

  const jsonLdBlocks: string[] = [];
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ld: RegExpExecArray | null;
  while ((ld = ldRe.exec(html)) !== null) {
    const block = ld[1].trim();
    if (block) jsonLdBlocks.push(block);
  }

  const { internal, external } = extractLinksFromHtml(html, pageUrl);

  const imageAlts: Array<{ src: string; alt: string | null }> = [];
  const imgRe = /<img\s[^>]*>/gi;
  let img: RegExpExecArray | null;
  while ((img = imgRe.exec(html)) !== null) {
    const tag = img[0];
    const src = attrValue(tag, "src");
    if (!src) continue;
    imageAlts.push({ src, alt: attrValue(tag, "alt") });
  }

  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = bodyMatch ? stripTags(bodyMatch[1]) : stripTags(html);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  return {
    title,
    metaDescription,
    robotsMeta,
    canonicalHref,
    h1Texts,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    twitterCard,
    twitterTitle,
    twitterImage,
    jsonLdBlocks,
    internalLinks: [...new Set(internal)],
    externalLinks: [...new Set(external)],
    imageAlts,
    wordCount,
    htmlBytes: new TextEncoder().encode(html).length,
  };
}
