import {
  isApparelFashionRetailQuery,
  isMinimalApparelRetailKeywordQuery,
} from "@/lib/search/hybrid-vector-postprocess";
import { expandSearchPhrase } from "@/lib/search/search-synonyms";

export function sanitizeIlikeToken(raw: string): string {
  return raw.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Common listing words for apparel retail — titles rarely contain literal "clothing". */
const APPAREL_ILIKE_EXTRA = ["boutique", "wear", "shop"];

const ILIKE_FIELDS = ["title", "slug", "excerpt", "search_keywords", "content"] as const;

export function buildStandardIlikeOrClause(q: string): string {
  const expanded = expandSearchPhrase(q)
    .map(sanitizeIlikeToken)
    .filter(Boolean)
    .slice(0, 6);
  const tokens = expanded.length > 0 ? [...new Set(expanded)] : [q];
  const parts: string[] = [];
  for (const token of tokens) {
    for (const field of ILIKE_FIELDS) {
      parts.push(`${field}.ilike.%${token}%`);
    }
  }
  return parts.join(",");
}

/**
 * OR many tokens × columns for **single-token** apparel queries (e.g. `clothing`).
 * Multi-word queries use {@link buildStandardIlikeOrClause}.
 */
export function buildApparelShoppingIlikeOrClause(
  normalizedQuery: string,
  searchTermOverride: string | undefined,
  rawQuery: string,
  intentSpecificItems: string[] | undefined,
): string | null {
  if (!isApparelFashionRetailQuery(normalizedQuery)) return null;
  if (!isMinimalApparelRetailKeywordQuery(normalizedQuery)) return null;

  const rawTokens = [
    sanitizeIlikeToken(searchTermOverride ?? ""),
    sanitizeIlikeToken(rawQuery),
    sanitizeIlikeToken(normalizedQuery),
    ...(intentSpecificItems ?? []).map((i) => sanitizeIlikeToken(i)),
    ...APPAREL_ILIKE_EXTRA,
  ];
  const tokens = [...new Set(rawTokens.filter((t) => t.length >= 3))].slice(0, 10);
  if (tokens.length === 0) return null;

  const parts: string[] = [];
  for (const t of tokens) {
    for (const f of ILIKE_FIELDS) {
      parts.push(`${f}.ilike.%${t}%`);
    }
  }
  return parts.join(",");
}

export function resolveIlikeOrClause(input: {
  normalizedQuery: string;
  rawQuery: string;
  searchTermOverride: string | undefined;
  intentCategory: string | null | undefined;
  intentSpecificItems: string[] | undefined;
  skipIlikeTextFilter: boolean;
}): string | null {
  if (input.skipIlikeTextFilter) return null;

  const ilikeSource = input.searchTermOverride ?? input.rawQuery;
  const searchToken =
    sanitizeIlikeToken(ilikeSource) || sanitizeIlikeToken(input.normalizedQuery) || "";
  const q = searchToken || "a";

  if (input.intentCategory === "shopping") {
    const apparelClause = buildApparelShoppingIlikeOrClause(
      input.normalizedQuery,
      input.searchTermOverride,
      input.rawQuery,
      input.intentSpecificItems,
    );
    if (apparelClause) return apparelClause;
  }

  return buildStandardIlikeOrClause(q);
}
