import { describe, expect, it } from "vitest";
import {
  adminBusinessPatchSchema,
  buildAdminBusinessPatch,
  type AdminBusinessRow,
} from "@/lib/admin/admin-business-direct-edit";

const base: AdminBusinessRow = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Old Title",
  slug: "old-title",
  phone: null,
  email: null,
  website: null,
  address: null,
  excerpt: "Short blurb",
  overview: null,
  content: null,
  seo_title: null,
  seo_description: null,
  search_keywords: null,
  search_terms: "old title short blurb",
  embedding_summary: "Old Title. Short blurb",
  service_area: null,
  town_id: null,
  area_id: null,
  primary_category_id: null,
  is_storefront: true,
  is_service_business: false,
  is_verified: false,
  is_explorable: false,
  map_lat: null,
  map_lng: null,
  search_tags: ["coffee"],
  main_image_url: null,
  hero_image_url: null,
  status: "published",
};

describe("buildAdminBusinessPatch", () => {
  it("returns null when nothing changed", () => {
    expect(buildAdminBusinessPatch(base, { title: "Old Title" })).toBeNull();
  });

  it("patches title and refreshes derived search fields", () => {
    const built = buildAdminBusinessPatch(base, { title: "New Cafe" });
    expect(built).not.toBeNull();
    expect(built!.patch.title).toBe("New Cafe");
    expect(built!.changes).toContain("title");
    expect(built!.changes).toEqual(
      expect.arrayContaining(["title", "search_terms", "embedding_summary"]),
    );
    expect(built!.patch).toHaveProperty("search_terms");
    expect(built!.patch).toHaveProperty("embedding_summary");
  });

  it("writes search_tags from the admin form when provided", () => {
    const built = buildAdminBusinessPatch(base, {
      search_tags: ["brunch", "coffee"],
    });
    expect(built!.patch.search_tags).toEqual(["brunch", "coffee"]);
  });

  it("regenerates slug when requested", () => {
    const built = buildAdminBusinessPatch(
      base,
      { title: "IV Bar", regenerate_slug: true },
      { takenSlugs: new Set(["old-title", "iv-bar"]) },
    );
    expect(built!.patch.slug).toBe("iv-bar-2");
  });
});

describe("adminBusinessPatchSchema", () => {
  it("accepts directory fields including verified/explorable", () => {
    const parsed = adminBusinessPatchSchema.safeParse({
      is_verified: true,
      is_explorable: true,
      town_id: "22222222-2222-4222-8222-222222222222",
      website: "https://example.com",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid website URLs", () => {
    const parsed = adminBusinessPatchSchema.safeParse({ website: "not-a-url" });
    expect(parsed.success).toBe(false);
  });
});
