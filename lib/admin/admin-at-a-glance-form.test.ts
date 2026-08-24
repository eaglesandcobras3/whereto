import { describe, expect, it } from "vitest";
import {
  atAGlancePatchFromValues,
  atAGlanceValuesFromRow,
  EMPTY_ADMIN_AT_A_GLANCE,
} from "@/lib/admin/admin-at-a-glance-form";

describe("admin-at-a-glance-form", () => {
  it("loads highlights as newline-separated text", () => {
    const values = atAGlanceValuesFromRow({
      at_a_glance_description: "Quiet stretch",
      highlights: ["walkable", "pools"],
    });
    expect(values.highlightsText).toBe("walkable\npools");
  });

  it("builds patch with parsed highlights", () => {
    const patch = atAGlancePatchFromValues({
      ...EMPTY_ADMIN_AT_A_GLANCE,
      highlightsText: "boutique shopping | walkable\ncoffee shops",
      walkability_rating: "Very walkable",
    });
    expect(patch.highlights).toEqual(["boutique shopping", "walkable", "coffee shops"]);
    expect(patch.walkability_rating).toBe("Very walkable");
  });
});
