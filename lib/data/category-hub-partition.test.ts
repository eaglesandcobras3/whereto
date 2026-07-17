import { describe, expect, it } from "vitest";
import { partitionCategoryBusinessesByTown } from "@/lib/data/category-hub";
import type { CategoryBusinessRow } from "@/lib/data/category-hub";

function biz(
  partial: Partial<CategoryBusinessRow> & Pick<CategoryBusinessRow, "id" | "slug" | "name">,
): CategoryBusinessRow {
  return {
    excerpt: null,
    hero_image_url: null,
    featured: false,
    price_level: null,
    town_id: null,
    town_name: null,
    town_slug: null,
    is_storefront: false,
    is_service_business: true,
    ...partial,
  };
}

describe("partitionCategoryBusinessesByTown", () => {
  it("puts town listings in town groups and no-town in regional", () => {
    const { townGroups, regional } = partitionCategoryBusinessesByTown([
      biz({
        id: "1",
        slug: "cafe",
        name: "Cafe",
        town_id: "t1",
        town_name: "Seaside",
        town_slug: "seaside",
        is_storefront: true,
        is_service_business: false,
      }),
      biz({ id: "2", slug: "plumber", name: "Plumber Co" }),
    ]);

    expect(townGroups).toHaveLength(1);
    expect(townGroups[0]?.slug).toBe("seaside");
    expect(townGroups[0]?.businesses).toHaveLength(1);
    expect(regional.map((b) => b.slug)).toEqual(["plumber"]);
  });

  it("does not invent an Other town group", () => {
    const { townGroups, regional } = partitionCategoryBusinessesByTown([
      biz({ id: "1", slug: "a", name: "A" }),
    ]);
    expect(townGroups).toEqual([]);
    expect(regional).toHaveLength(1);
  });
});
