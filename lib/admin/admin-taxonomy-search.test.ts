import { describe, expect, it } from "vitest";

function categoryHaystack(row: {
  title: string;
  slug: string;
  parent_title: string | null;
}): string {
  return [row.title, row.slug, row.parent_title ?? "", row.slug.replace(/_/g, " ")]
    .join(" ")
    .toLowerCase();
}

function tagMatches(
  row: { tag: string; description: string | null; category_slugs: string[] },
  needle: string,
): boolean {
  const tagLabel = row.tag.replace(/_/g, " ");
  return (
    row.tag.includes(needle) ||
    tagLabel.includes(needle) ||
    (row.description?.toLowerCase().includes(needle) ?? false) ||
    row.category_slugs.some(
      (slug) => slug.includes(needle) || slug.replace(/_/g, " ").includes(needle),
    )
  );
}

describe("admin taxonomy search", () => {
  it("matches categories by rollup title", () => {
    const hay = categoryHaystack({
      title: "Restaurant",
      slug: "restaurant",
      parent_title: "Food & Drink",
    });
    expect(hay.includes("food")).toBe(true);
  });

  it("matches tags by linked category slug", () => {
    expect(
      tagMatches(
        { tag: "pizza", description: null, category_slugs: ["restaurant"] },
        "restaurant",
      ),
    ).toBe(true);
  });
});
