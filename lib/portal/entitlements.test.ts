import { describe, expect, it } from "vitest";
import { filterChangesForEntitlements, parseEntitlements } from "@/lib/portal/entitlements";

describe("parseEntitlements", () => {
  it("falls back to claimed_listing defaults", () => {
    expect(parseEntitlements(null, "claimed_listing")).toEqual({
      max_photos: 2,
      hours: false,
      social_links: false,
      long_description: false,
    });
  });

  it("merges partial plan json", () => {
    expect(parseEntitlements({ max_photos: 5 }, "local_partner")).toEqual({
      max_photos: 5,
      hours: true,
      social_links: true,
      long_description: true,
    });
  });
});

describe("filterChangesForEntitlements", () => {
  const free = parseEntitlements(null, "claimed_listing");

  it("strips hours and social on free tier", () => {
    const out = filterChangesForEntitlements(
      { phone: "850-555-0100", hours: "9-5", social_links: { instagram: "x" } },
      free,
    );
    expect(out).toEqual({ phone: "850-555-0100" });
  });

  it("maps content to excerpt on free tier", () => {
    const out = filterChangesForEntitlements({ content: "a".repeat(600) }, free);
    expect(out.excerpt).toHaveLength(500);
    expect(out.content).toBeUndefined();
  });
});
