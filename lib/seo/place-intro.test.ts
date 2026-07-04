import { describe, expect, it } from "vitest";
import { isSeoBoilerplateIntro, resolvePlaceIntro } from "@/lib/seo/place-intro";

describe("isSeoBoilerplateIntro", () => {
  it("flags complete-guide SEO filler", () => {
    expect(
      isSeoBoilerplateIntro(
        "This complete guide covers where to stay, what to do, where to eat, beach access, family tips, parking, and everything to know before planning a Rosemary Beach trip.",
      ),
    ).toBe(true);
  });

  it("flags area-style guide covers copy", () => {
    expect(
      isSeoBoilerplateIntro(
        "This guide covers where to eat, where to shop, when to go, parking tips, photo spots, family advice, nearby beach access, and everything to know before visiting Rosemary Beach Town Square.",
      ),
    ).toBe(true);
  });

  it("allows normal editorial intros", () => {
    expect(
      isSeoBoilerplateIntro(
        "What Rosemary Beach is like on 30A: walkable streets, a compact town center, and the week-to-week rhythm behind the polished look.",
      ),
    ).toBe(false);
  });
});

describe("resolvePlaceIntro", () => {
  it("prefers seo_description over a boilerplate excerpt", () => {
    const intro = resolvePlaceIntro({
      excerpt:
        "Luxury rentals and beach access. This complete guide covers where to stay, what to do, where to eat, beach access, family tips, parking, and everything to know before planning a Rosemary Beach trip.",
      seoDescription:
        "What Rosemary Beach is like on 30A: walkable streets, a compact town center, and the week-to-week rhythm behind the polished look.",
      fallback: "Fallback intro.",
    });
    expect(intro).toContain("walkable streets");
    expect(intro).not.toContain("complete guide covers");
  });

  it("falls back when both fields are SEO filler", () => {
    const intro = resolvePlaceIntro({
      excerpt: "This complete guide covers where to stay and everything to know before planning a trip.",
      seoDescription: null,
      fallback: "Fallback intro.",
    });
    expect(intro).toBe("Fallback intro.");
  });
});
