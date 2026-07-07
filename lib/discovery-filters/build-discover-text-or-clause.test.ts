import { describe, expect, it } from "vitest";
import { buildDiscoverTextOrClause } from "@/lib/discovery-filters/build-discover-text-or-clause";

describe("buildDiscoverTextOrClause", () => {
  it("ORs individual tokens instead of matching the whole phrase", () => {
    const clause = buildDiscoverTextOrClause("donuts donut shop doughnuts fresh donuts");
    expect(clause).toContain("title.ilike.%donuts%");
    expect(clause).toContain("title.ilike.%donut%");
    expect(clause).not.toContain("%donuts donut shop doughnuts fresh donuts%");
  });
});
