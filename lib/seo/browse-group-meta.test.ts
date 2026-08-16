import { describe, expect, it } from "vitest";
import {
  browseGroupMetaNoun,
  buildBrowseGroupHubMetaDescription,
} from "@/lib/seo/browse-group-meta";

describe("browse group hub meta descriptions", () => {
  it("uses natural noun phrases instead of raw lowercased titles", () => {
    expect(browseGroupMetaNoun("food_and_drink", "Food & Drink")).toBe(
      "food and drink spots",
    );
    const description = buildBrowseGroupHubMetaDescription({
      groupSlug: "food_and_drink",
      title: "Food & Drink",
      listingCount: 171,
      townCount: 15,
    });
    expect(description).toContain("171 food and drink spots");
    expect(description).not.toMatch(/Browse \d+ food & drink/i);
    expect(description).toContain("across 15 towns");
  });

  it("handles empty inventory", () => {
    const description = buildBrowseGroupHubMetaDescription({
      groupSlug: "medical",
      title: "Medical",
      listingCount: 0,
      townCount: 0,
    });
    expect(description).toContain("health and medical providers");
    expect(description).toContain("South Walton");
  });
});
