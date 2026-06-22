import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncRankScoreGuides } from "@/lib/rankscore/sync-guides";

const summaries = [
  { id: "new-article", slug: "new-guide", title: "New Guide" },
  { id: "existing-article", slug: "existing-guide", title: "Existing Guide" },
];

const fullArticles: Record<string, object> = {
  "new-article": {
    id: "new-article",
    slug: "new-guide",
    title: "New Guide",
    content_markdown: "Fresh copy.",
    updated_at: "2026-06-19T12:00:00.000Z",
  },
  "existing-article": {
    id: "existing-article",
    slug: "existing-guide",
    title: "Existing Guide",
    content_markdown: "Should not overwrite.",
    updated_at: "2026-06-20T12:00:00.000Z",
  },
};

vi.mock("@/lib/rankscore/mirror-guide-hero", () => ({
  mirrorGuideHeroToStorage: vi.fn(async () => "https://cdn.example.com/hosted/hero.webp"),
}));

vi.mock("@/lib/rankscore/client", () => ({
  fetchAllRankScoreArticleSummaries: vi.fn(async () => summaries),
  fetchRankScoreArticle: vi.fn(async (id: string) => fullArticles[id]),
}));

function makeSupabase(existingSlugs: string[] = ["existing-guide"]) {
  const insert = vi.fn(async () => ({ error: null }));

  const from = vi.fn((table: string) => {
    if (table !== "guides") return {};

    return {
      select: (cols: string) => {
        if (cols === "rankscore_article_id") {
          return {
            limit: vi.fn(async () => ({ error: { message: "rankscore_article_id" } })),
          };
        }
        if (cols === "main_image_url, hero_image_url") {
          return {
            limit: vi.fn(async () => ({ error: null })),
          };
        }
        return {
          is: vi.fn(async () => ({
            data: existingSlugs.map((slug) => ({ id: `id-${slug}`, slug })),
            error: null,
          })),
        };
      },
      insert,
    };
  });

  return { supabase: { from } as unknown as SupabaseClient, insert };
}

describe("syncRankScoreGuides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates only new slugs and skips existing ones without updating", async () => {
    const { supabase, insert } = makeSupabase(["existing-guide"]);

    const result = await syncRankScoreGuides(supabase);

    expect(result).toMatchObject({
      scanned: 2,
      fetched: 1,
      created: 1,
      updated: 0,
      skipped: 1,
      errors: [],
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0]?.[0]).toMatchObject({ slug: "new-guide", title: "New Guide" });
  });
});
