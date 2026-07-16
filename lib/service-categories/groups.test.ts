import { describe, expect, it } from "vitest";
import { SERVICE_CATEGORY_SLUGS } from "@/lib/service-categories/constants";
import {
  SERVICE_CATEGORY_GROUP_MEMBERS,
  SERVICE_CATEGORY_GROUP_SLUGS,
  serviceCategoryGroupForSlug,
} from "@/lib/service-categories/groups";

describe("service category browse groups", () => {
  it("maps every canonical slug to exactly one named group", () => {
    const grouped = new Set<string>();
    for (const members of Object.values(SERVICE_CATEGORY_GROUP_MEMBERS)) {
      for (const slug of members) grouped.add(slug);
    }
    expect(grouped.size).toBe(SERVICE_CATEGORY_SLUGS.length);
    expect(SERVICE_CATEGORY_GROUP_SLUGS).toHaveLength(11);
    for (const slug of SERVICE_CATEGORY_SLUGS) {
      expect(grouped.has(slug)).toBe(true);
      expect(serviceCategoryGroupForSlug(slug)).toBeTruthy();
    }
  });

  it("splits vacation rentals from outdoor property", () => {
    expect(serviceCategoryGroupForSlug("vacation_rentals")).toBe("vacation_guest");
    expect(serviceCategoryGroupForSlug("landscaping")).toBe("outdoor_property");
    expect(serviceCategoryGroupForSlug("property_management")).toBe("vacation_guest");
  });

  it("keeps creative, tech, marine, and auto in named groups (not a catch-all)", () => {
    expect(serviceCategoryGroupForSlug("marketing_creative")).toBe("creative_events");
    expect(serviceCategoryGroupForSlug("photography")).toBe("creative_events");
    expect(serviceCategoryGroupForSlug("it_computer")).toBe("tech_office");
    expect(serviceCategoryGroupForSlug("marine_boat")).toBe("marine");
    expect(serviceCategoryGroupForSlug("auto_repair")).toBe("auto_transport");
    expect(serviceCategoryGroupForSlug("pet_services")).toBe("family_pets");
    expect(serviceCategoryGroupForSlug("storage")).toBe("other_services");
  });
});

describe("service browse group paths", () => {
  it("uses path detail pages not hash anchors", async () => {
    const { serviceBrowseGroupHubPath } = await import("@/lib/service-categories/browse-group-nav");
    expect(serviceBrowseGroupHubPath("home_trades")).toBe("/services/home-trades");
    expect(serviceBrowseGroupHubPath("vacation_guest")).toBe("/services/vacation-guest");
    expect(serviceBrowseGroupHubPath("creative_events")).toBe("/services/creative-events");
  });
});
