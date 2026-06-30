import { describe, expect, it } from "vitest";
import { isGuideEnriched, mergeGuideCustomFields } from "@/lib/guides/custom-fields";
import { assertCanPublish } from "@/lib/admin/guides";
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
  it("blocks publish when not enriched", () => {
    expect(assertCanPublish("published", {}, "draft")).toMatch(/enriched/i);
  });

  it("allows publish when enriched", () => {
    expect(
      assertCanPublish("published", { enriched_at: "2026-01-01T00:00:00Z" }, "draft"),
    ).toBeNull();
  });

  it("allows staying published", () => {
    expect(assertCanPublish("published", {}, "published")).toBeNull();
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
