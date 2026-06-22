export type RankScoreArticleSummary = {
  id: string;
  slug?: string | null;
  title?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  published_at?: string | null;
};

export type RankScoreArticle = RankScoreArticleSummary & {
  content_html?: string | null;
  content_markdown?: string | null;
  meta_description?: string | null;
  hero_image_url?: string | null;
  keyword?: string | null;
  keywords?: string[] | null;
};

export type RankScoreSyncGuidePayload = {
  rankscore_article_id: string;
  slug: string;
  title: string;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  excerpt: string | null;
  search_keywords: string | null;
  hero_image_url: string | null;
  published_at: string | null;
  rankscore_updated_at: string | null;
};

export type RankScoreSyncResult = {
  scanned: number;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};
