import { describe, expect, it } from "vitest";
import { isGuideEnriched, mergeGuideCustomFields, hasGuideSearchProfile } from "@/lib/guides/custom-fields";
import { assertCanPublish, mainImagePatch } from "@/lib/admin/guides";
import { validateGuideMarkdown } from "@/lib/guides/validate-markdown";

describe("validateGuideMarkdown", () => {
  it("accepts markdown body", () => {
    expect(validateGuideMarkdown("# Hello\n\nSome **markdown**.")).toEqual({ ok: true });
  });

  it("rejects empty content", () => {
    expect(validateGuideMarkdown("   ")).toEqual({
      ok: false,
      error: "Content is required (markdown body).",
    });
  });

  it("rejects HTML documents", () => {
    expect(validateGuideMarkdown("<!DOCTYPE html><html><body>Hi</body></html>")).toEqual({
      ok: false,
      error: "Content must be markdown, not HTML. Paste markdown text only.",
    });
  });
});

describe("guide enrichment gate", () => {
  it("blocks publish when search profile is missing", () => {
    expect(assertCanPublish("published", { enriched_at: "2026-01-01T00:00:00Z" }, "draft")).toMatch(
      /search profile/i,
    );
  });

  it("allows publish when search profile exists", () => {
    expect(
      assertCanPublish(
        "published",
        { enriched_at: "2026-01-01T00:00:00Z", search_profile: "30A beach guide for families." },
        "draft",
      ),
    ).toBeNull();
  });

  it("allows staying published", () => {
    expect(assertCanPublish("published", {}, "published")).toBeNull();
  });
});

describe("hasGuideSearchProfile", () => {
  it("detects search profile", () => {
    expect(hasGuideSearchProfile({ search_profile: "Trip planning tips." })).toBe(true);
    expect(hasGuideSearchProfile({ enriched_at: "2026-06-01" })).toBe(false);
  });
});

describe("mainImagePatch", () => {
  it("sets URL and clears Directus UUID", () => {
    expect(mainImagePatch("https://cdn.example/hero.webp")).toEqual({
      main_image_url: "https://cdn.example/hero.webp",
      main_image: null,
    });
  });

  it("clears both when removed", () => {
    expect(mainImagePatch(null)).toEqual({
      main_image_url: null,
      main_image: null,
    });
  });

  it("returns null when unchanged", () => {
    expect(mainImagePatch(undefined)).toBeNull();
  });
});

describe("custom_fields helpers", () => {
  it("detects enriched guides", () => {
    expect(isGuideEnriched({ enriched_at: "2026-06-01" })).toBe(true);
    expect(isGuideEnriched({})).toBe(false);
  });

  it("merges custom fields", () => {
    expect(
      mergeGuideCustomFields({ foo: 1 }, { search_profile: "test", enriched_at: "x" }),
    ).toEqual({ foo: 1, search_profile: "test", enriched_at: "x" });
  });
});
