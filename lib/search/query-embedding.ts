import OpenAI from "openai";
import { searchQueryEmbeddingsEnabled } from "@/lib/search/search-openai-flags";

const EMBED_CACHE_MAX = 256;
const embeddingResultCache = new Map<string, number[] | null>();
const embeddingInflight = new Map<string, Promise<number[] | null>>();

function touchEmbeddingCache(key: string, value: number[] | null) {
  embeddingResultCache.delete(key);
  embeddingResultCache.set(key, value);
  while (embeddingResultCache.size > EMBED_CACHE_MAX) {
    const oldest = embeddingResultCache.keys().next().value;
    if (oldest !== undefined) embeddingResultCache.delete(oldest);
  }
}

async function embedQueryFromApi(query: string, openaiKey: string): Promise<number[] | null> {
  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.slice(0, 8000),
      dimensions: 1536,
    });
    return res.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Query vector for hybrid search — respects `SEARCH_QUERY_EMBEDDINGS`, then LRU + in-flight dedupe
 * so identical normalized queries do not hit the embeddings API repeatedly.
 */
export async function getSearchQueryEmbedding(
  normalizedQuery: string,
  openaiKey: string,
): Promise<number[] | null> {
  if (!searchQueryEmbeddingsEnabled()) return null;

  const key = normalizedQuery.trim();
  if (!key.length) return null;

  if (embeddingResultCache.has(key)) {
    const cached = embeddingResultCache.get(key)!;
    touchEmbeddingCache(key, cached);
    return cached;
  }

  let inflight = embeddingInflight.get(key);
  if (inflight) return inflight;

  inflight = embedQueryFromApi(key, openaiKey)
    .then((vec) => {
      if (vec != null) touchEmbeddingCache(key, vec);
      return vec;
    })
    .finally(() => {
      embeddingInflight.delete(key);
    });
  embeddingInflight.set(key, inflight);
  return inflight;
}

/** Same input as vector path — safe to `Promise.all` with `resolveIntent`. */
export async function embedNormalizedSearchQuery(
  normalizedQuery: string,
  openaiKey: string,
): Promise<number[] | null> {
  return getSearchQueryEmbedding(normalizedQuery, openaiKey);
}
