import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAllRankScoreArticleSummaries,
  fetchRankScoreArticle,
} from "@/lib/rankscore/client";
import { mapRankScoreArticleToGuide } from "@/lib/rankscore/map-article";
import type { RankScoreSyncGuidePayload, RankScoreSyncResult } from "@/lib/rankscore/types";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import {
  applyGuideHeroFields,
  detectGuideImageColumnSupport,
} from "@/lib/rankscore/guide-image-fields";
import { mirrorGuideHeroToStorage } from "@/lib/rankscore/mirror-guide-hero";

type ExistingGuideRow = {
  id: string;
  slug: string;
  rankscore_article_id?: string | null;
};

const RATE_LIMIT_DELAY_MS = 1_100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ExistingGuideIndex = {
  byRankScoreId: Map<string, ExistingGuideRow>;
  bySlug: Map<string, ExistingGuideRow>;
};

async function loadExistingGuides(supabase: SupabaseClient): Promise<ExistingGuideIndex> {
  const withRankScore = await supabase
    .from("guides")
    .select("id, slug, rankscore_article_id")
    .is("archived_at", null);

  const rows =
    withRankScore.error?.message?.includes("rankscore_article_id")
      ? (
          await supabase
            .from("guides")
            .select("id, slug")
            .is("archived_at", null)
        ).data
      : withRankScore.data;

  if (withRankScore.error && !withRankScore.error.message?.includes("rankscore_article_id")) {
    throw new Error(`guides lookup failed: ${withRankScore.error.message}`);
  }

  const byRankScoreId = new Map<string, ExistingGuideRow>();
  const bySlug = new Map<string, ExistingGuideRow>();

  for (const row of rows ?? []) {
    const guide = row as ExistingGuideRow;
    const rankscoreId = String(guide.rankscore_article_id ?? "").trim();
    if (rankscoreId) byRankScoreId.set(rankscoreId, guide);
    const slug = normalizeUrlSegment(String(guide.slug ?? ""));
    if (slug) bySlug.set(slug, guide);
  }

  return { byRankScoreId, bySlug };
}

function guideAlreadyExists(
  index: ExistingGuideIndex,
  articleId: string,
  slug: string,
): boolean {
  if (index.byRankScoreId.has(articleId)) return true;
  const normalized = normalizeUrlSegment(slug);
  return normalized ? index.bySlug.has(normalized) : false;
}

function buildGuidePayload(
  mapped: RankScoreSyncGuidePayload,
  includeRankScoreId: boolean,
) {
  const payload: Record<string, unknown> = {
    slug: mapped.slug,
    title: mapped.title,
    content: mapped.content,
    seo_title: mapped.seo_title,
    seo_description: mapped.seo_description,
    excerpt: mapped.excerpt,
    guide_type: "editorial",
    featured: false,
    search_keywords: mapped.search_keywords,
    status: "published",
    is_hidden_from_search: null,
    date_updated: mapped.rankscore_updated_at ?? new Date().toISOString(),
  };
  if (includeRankScoreId) {
    payload.rankscore_article_id = mapped.rankscore_article_id;
  }
  return payload;
}

async function resolveHostedGuideHero(
  supabase: SupabaseClient,
  mapped: RankScoreSyncGuidePayload,
): Promise<string | null> {
  const source = String(mapped.hero_image_url ?? "").trim();
  if (!source) return null;
  if (!/^https?:\/\//i.test(source)) return source;

  try {
    return await mirrorGuideHeroToStorage(supabase, {
      sourceUrl: source,
      slug: mapped.slug,
    });
  } catch (err) {
    console.warn(
      `rankscore sync: hero mirror failed for ${mapped.slug}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function insertGuide(
  supabase: SupabaseClient,
  mapped: RankScoreSyncGuidePayload,
  includeRankScoreId: boolean,
  imageSupport: { urlImageFields: boolean },
  hostedHeroUrl: string | null,
): Promise<void> {
  const payload = buildGuidePayload(mapped, includeRankScoreId);
  applyGuideHeroFields(payload, hostedHeroUrl, imageSupport);
  const { error } = await supabase.from("guides").insert({
    id: randomUUID(),
    ...payload,
    published_at: mapped.published_at ?? new Date().toISOString(),
  });
  if (error) throw new Error(`guide insert failed (${mapped.slug}): ${error.message}`);
}

export async function syncRankScoreGuides(
  supabase: SupabaseClient,
  options?: {
    maxArticles?: number;
    dryRun?: boolean;
  },
): Promise<RankScoreSyncResult> {
  const result: RankScoreSyncResult = {
    scanned: 0,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const summaries = await fetchAllRankScoreArticleSummaries({
    maxArticles: options?.maxArticles,
  });
  result.scanned = summaries.length;

  const existingIndex = await loadExistingGuides(supabase);
  const includeRankScoreId = !(
    await supabase.from("guides").select("rankscore_article_id").limit(1)
  ).error;
  const imageSupport = await detectGuideImageColumnSupport(supabase);

  for (const summary of summaries) {
    const articleId = String(summary.id ?? "").trim();
    if (!articleId) {
      result.skipped += 1;
      continue;
    }

    const summarySlug = normalizeUrlSegment(String(summary.slug ?? ""));
    if (guideAlreadyExists(existingIndex, articleId, summarySlug)) {
      result.skipped += 1;
      continue;
    }

    try {
      const article = await fetchRankScoreArticle(articleId);
      result.fetched += 1;

      const mapped = mapRankScoreArticleToGuide(article);
      if (!mapped) {
        result.skipped += 1;
        result.errors.push(`${articleId}: missing title or body`);
        continue;
      }

      if (guideAlreadyExists(existingIndex, mapped.rankscore_article_id, mapped.slug)) {
        result.skipped += 1;
        continue;
      }

      if (options?.dryRun) {
        result.created += 1;
        continue;
      }

      const hostedHeroUrl = await resolveHostedGuideHero(supabase, mapped);
      await insertGuide(supabase, mapped, includeRankScoreId, imageSupport, hostedHeroUrl);
      result.created += 1;

      const synced: ExistingGuideRow = {
        id: mapped.rankscore_article_id,
        slug: mapped.slug,
        rankscore_article_id: mapped.rankscore_article_id,
      };
      existingIndex.byRankScoreId.set(mapped.rankscore_article_id, synced);
      existingIndex.bySlug.set(mapped.slug, synced);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${articleId}: ${message}`);
    }

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return result;
}
