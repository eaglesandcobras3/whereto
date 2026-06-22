import { slugifyBusinessTitle } from "@/lib/portal/slug";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import type { RankScoreArticle, RankScoreSyncGuidePayload } from "@/lib/rankscore/types";

function normalizeGuideSlug(article: RankScoreArticle): string {
  const fromApi = normalizeUrlSegment(String(article.slug ?? ""));
  if (fromApi && !isReservedRootSlug(fromApi)) return fromApi;

  const fromTitle = slugifyBusinessTitle(String(article.title ?? "").trim());
  if (fromTitle && !isReservedRootSlug(fromTitle)) return fromTitle;

  const idStem = String(article.id ?? "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return idStem ? `guide-${idStem}` : "guide";
}

function buildSearchKeywords(article: RankScoreArticle): string | null {
  const parts = new Set<string>();
  const keyword = String(article.keyword ?? "").trim();
  if (keyword) parts.add(keyword);
  for (const item of article.keywords ?? []) {
    const trimmed = String(item ?? "").trim();
    if (trimmed) parts.add(trimmed);
  }
  if (parts.size === 0) return null;
  return [...parts].join(", ");
}

function pickGuideBody(article: RankScoreArticle): string {
  return String(article.content_markdown ?? "").trim();
}

export function mapRankScoreArticleToGuide(article: RankScoreArticle): RankScoreSyncGuidePayload | null {
  const id = String(article.id ?? "").trim();
  const title = String(article.title ?? "").trim();
  const body = pickGuideBody(article);
  if (!id || !title || !body) return null;

  const slug = normalizeGuideSlug(article);
  const seoDescription = String(article.meta_description ?? "").trim() || null;
  const heroImage = String(article.hero_image_url ?? "").trim() || null;
  const content = stripLeadingH1MatchingTitle(body, title).trim();
  const updatedAt =
    String(article.updated_at ?? article.published_at ?? article.created_at ?? "").trim() || null;
  const publishedAt =
    String(article.published_at ?? article.created_at ?? "").trim() || null;

  return {
    rankscore_article_id: id,
    slug,
    title,
    content,
    seo_title: title,
    seo_description: seoDescription,
    excerpt: seoDescription,
    search_keywords: buildSearchKeywords(article),
    hero_image_url: heroImage,
    published_at: publishedAt,
    rankscore_updated_at: updatedAt,
  };
}
