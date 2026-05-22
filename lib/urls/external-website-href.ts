/**
 * Absolute URL for outbound business / venue website links.
 * Values like `example.com` are interpreted as **relative** by the browser on routes such as `/business/[slug]`
 * and become `https://site.com/business/example.com` — prepend a scheme to avoid that.
 */
export function externalWebsiteHref(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  return `https://${t}`;
}
