import { describe, expect, it } from "vitest";
import { normalizeEnrichmentSlug } from "@/lib/guides/guide-enrichment-schema";

describe("normalizeEnrichmentSlug", () => {
  it("normalizes AI slug output", () => {
    expect(normalizeEnrichmentSlug("Ultimate 30A Guide!", "Fallback Title")).toBe(
      "ultimate-30a-guide",
    );
  });

  it("falls back to title when slug is too short", () => {
    expect(normalizeEnrichmentSlug("ab", "Rosemary Beach Dining")).toBe("rosemary-beach-dining");
  });
});
