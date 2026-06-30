export type AuditSeverity = "error" | "warning" | "notice";

export type AuditCategory =
  | "indexability"
  | "content"
  | "social"
  | "structured_data"
  | "links"
  | "sitemap"
  | "technical"
  | "images";

export type AuditIssue = {
  severity: AuditSeverity;
  category: AuditCategory;
  rule: string;
  url?: string;
  detail: string;
};

export type PageKind =
  | "home"
  | "hub"
  | "town"
  | "area"
  | "guide"
  | "category_hub"
  | "browse_group"
  | "service_group"
  | "business"
  | "seo_intent"
  | "event"
  | "utility"
  | "other";

export type ParsedPageHtml = {
  title: string | null;
  metaDescription: string | null;
  robotsMeta: string | null;
  canonicalHref: string | null;
  h1Texts: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterImage: string | null;
  jsonLdBlocks: string[];
  internalLinks: string[];
  externalLinks: string[];
  imageAlts: Array<{ src: string; alt: string | null }>;
  wordCount: number;
  htmlBytes: number;
};

export type CrawledPage = {
  url: string;
  finalUrl: string;
  status: number;
  redirectHops: number;
  fetchError?: string;
  html?: string;
  parsed?: ParsedPageHtml;
  kind: PageKind;
  crawlDepth: number;
};

export type AuditSummary = {
  urlsDiscovered: number;
  urlsCrawled: number;
  urlsFailed: number;
  issueCounts: Record<AuditSeverity, number>;
  categoryCounts: Record<AuditCategory, number>;
  topRules: Array<{ rule: string; count: number }>;
  durationMs: number;
};

export type SiteAuditReport = {
  baseUrl: string;
  startedAt: string;
  completedAt: string;
  summary: AuditSummary;
  issues: AuditIssue[];
  crawledUrls: string[];
  sitemapUrls: string[];
  seedUrls: string[];
};

export type RunSiteAuditOptions = {
  baseUrl: string;
  fetchFn?: typeof fetch;
  concurrency?: number;
  maxUrls?: number;
  maxDepth?: number;
  timeBudgetMs?: number;
  includeBusinessUrls?: boolean;
  includeSeoIntentUrls?: boolean;
  onProgress?: (done: number, total: number) => void;
};
