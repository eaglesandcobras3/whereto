/** Tokenize for cheap content-overlap checks (IRSE uniqueness). */
export function overlapTokens(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");
  return new Set(cleaned.split(/\s+/).filter((w) => w.length > 3));
}

export function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Town SEO titles that follow the shared “Where to Stay, Eat, Beach…” pattern.
 * Near-identical titles across hubs are a doorway / uniqueness risk.
 */
export function isTemplatedTownSeoTitle(title: string | null | undefined): boolean {
  const t = title?.trim().toLowerCase() ?? "";
  if (!t) return false;
  const stayEat = /where to stay/.test(t) && /\beat\b/.test(t);
  const exploreOr30a = /\bexplore\b/.test(t) || /\b30a\b/.test(t);
  return stayEat && exploreOr30a;
}
