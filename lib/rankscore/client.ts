import { requireRankScoreConfig } from "@/lib/rankscore/config";
import type { RankScoreArticle, RankScoreArticleSummary } from "@/lib/rankscore/types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;
const RATE_LIMIT_DELAY_MS = 1_100;

export class RankScoreApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RankScoreApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rankScoreFetch<T>(path: string, attempt = 0): Promise<T> {
  const { apiBase, apiKey } = requireRankScoreConfig();
  const res = await fetch(`${apiBase}${path}`, {
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 429 && attempt < 3) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "60");
    await sleep(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 60_000);
    return rankScoreFetch<T>(path, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new RankScoreApiError(
      `RankScore API ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

export async function listRankScoreArticles(options?: {
  limit?: number;
  offset?: number;
}): Promise<RankScoreArticleSummary[]> {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const offset = Math.max(options?.offset ?? 0, 0);
  const rows = await rankScoreFetch<RankScoreArticleSummary[]>(
    `/articles?limit=${limit}&offset=${offset}`,
  );
  return Array.isArray(rows) ? rows : [];
}

export async function fetchRankScoreArticle(articleId: string): Promise<RankScoreArticle> {
  return rankScoreFetch<RankScoreArticle>(`/articles/${encodeURIComponent(articleId)}`);
}

export async function fetchAllRankScoreArticleSummaries(options?: {
  pageSize?: number;
  maxArticles?: number;
}): Promise<RankScoreArticleSummary[]> {
  const pageSize = Math.min(Math.max(options?.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const maxArticles = options?.maxArticles;
  const all: RankScoreArticleSummary[] = [];
  let offset = 0;

  while (true) {
    const batch = await listRankScoreArticles({ limit: pageSize, offset });
    if (batch.length === 0) break;
    all.push(...batch);
    if (maxArticles != null && all.length >= maxArticles) {
      return all.slice(0, maxArticles);
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return all;
}
