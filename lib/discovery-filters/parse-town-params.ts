/** Parse URL `town` param into slugs (comma-separated). */
export function parseTownSlugsFromParam(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const token of raw.split(",")) {
    const slug = token.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }

  return out;
}
