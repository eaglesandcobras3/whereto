import { describe, it, expect } from "vitest";
import { mapRankScoreArticleToGuide } from "@/lib/rankscore/map-article";
import type { RankScoreArticle } from "@/lib/rankscore/types";

describe("mapRankScoreArticleToGuide", () => {
  it("maps markdown content and SEO fields", () => {
    const article: RankScoreArticle = {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "best-coffee-on-30a",
      title: "Best Coffee on 30A",
      content_markdown: "# Best Coffee on 30A\n\nStart at Amavida.",
      meta_description: "Where to grab coffee along Scenic 30A.",
      hero_image_url: "https://cdn.example.com/hero.jpg",
      keyword: "30A coffee",
      keywords: ["coffee shops", "emerald coast"],
      updated_at: "2026-06-19T12:00:00.000Z",
      published_at: "2026-06-18T10:00:00.000Z",
    };

    const mapped = mapRankScoreArticleToGuide(article);
    expect(mapped).toMatchObject({
      rankscore_article_id: "11111111-1111-1111-1111-111111111111",
      slug: "best-coffee-on-30a",
      title: "Best Coffee on 30A",
      content: "Start at Amavida.",
      seo_description: "Where to grab coffee along Scenic 30A.",
      hero_image_url: "https://cdn.example.com/hero.jpg",
      search_keywords: "30A coffee, coffee shops, emerald coast",
    });
  });

  it("avoids reserved root slugs", () => {
    const mapped = mapRankScoreArticleToGuide({
      id: "abc",
      slug: "guides",
      title: "Planning 30A",
      content_markdown: "Body copy",
    });
    expect(mapped?.slug).toBe("planning-30a");
  });

  it("returns null when body is missing", () => {
    expect(
      mapRankScoreArticleToGuide({
        id: "abc",
        slug: "empty",
        title: "Empty",
      }),
    ).toBeNull();
  });

  it("ignores content_html when content_markdown is absent", () => {
    expect(
      mapRankScoreArticleToGuide({
        id: "abc",
        slug: "html-only",
        title: "HTML Only",
        content_html: "<p>Not used</p>",
      }),
    ).toBeNull();
  });
});
