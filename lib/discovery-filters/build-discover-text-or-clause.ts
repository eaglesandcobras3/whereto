import { sanitizeIlikeToken } from "@/lib/search/ilike-text-search";
import { expandSearchPhrase } from "@/lib/search/search-synonyms";

const DISCOVER_ILIKE_FIELDS = ["title", "slug", "search_keywords", "excerpt"] as const;

const MAX_TOKENS = 12;

/**
 * OR individual query tokens across discover text columns.
 * Multi-word residual queries from NL expansion (e.g. "donuts donut shop doughnuts")
 * must not be matched as one literal substring.
 */
export function buildDiscoverTextOrClause(rawQ: string): string | null {
  const trimmed = rawQ.trim();
  if (!trimmed) return null;

  const tokens = new Set<string>();

  for (const word of trimmed.split(/\s+/)) {
    const safe = sanitizeIlikeToken(word);
    if (safe.length < 2) continue;
    for (const phrase of expandSearchPhrase(safe)) {
      const expanded = sanitizeIlikeToken(phrase);
      if (expanded.length >= 2) tokens.add(expanded);
    }
  }

  const wholePhrase = sanitizeIlikeToken(trimmed);
  if (wholePhrase.length >= 2) {
    for (const phrase of expandSearchPhrase(wholePhrase)) {
      const expanded = sanitizeIlikeToken(phrase);
      if (expanded.length >= 2) tokens.add(expanded);
    }
  }

  const limited = [...tokens].slice(0, MAX_TOKENS);
  if (!limited.length) return null;

  const parts: string[] = [];
  for (const token of limited) {
    for (const field of DISCOVER_ILIKE_FIELDS) {
      parts.push(`${field}.ilike.%${token}%`);
    }
  }

  return parts.join(",");
}
