import { describe, expect, it } from "vitest";
import { formatDiscoverInterpretation } from "@/lib/discovery-filters/format-discover-interpretation";

describe("formatDiscoverInterpretation", () => {
  it("describes seafood near rosemary as keyword search with anchor priority", () => {
    const text = formatDiscoverInterpretation({
      type: "storefront",
      tags: ["seafood"],
      anchorTownNames: ["Rosemary Beach"],
      effectiveTownNames: ["Rosemary Beach", "Inlet Beach", "Seaside"],
      townScope: "near",
      labelForSlug: (slug) => slug.replace(/_/g, " "),
    });

    expect(text).toContain("seafood");
    expect(text).toContain("restaurants, markets");
    expect(text).toContain("near Rosemary Beach");
    expect(text).toContain("Rosemary Beach ranked first");
  });

  it("omits town phrasing for services", () => {
    const text = formatDiscoverInterpretation({
      type: "service",
      tags: [],
      serviceCategoryLabel: "Home services",
      anchorTownNames: ["Seaside"],
      effectiveTownNames: ["Seaside"],
      townScope: "exact",
      labelForSlug: (slug) => slug,
    });

    expect(text).toBe("home services");
    expect(text).not.toContain("Seaside");
  });
});
