import { describe, expect, it } from "vitest";
import { mergeAuditRow, skippedVerifiedRow } from "./merge-audit-row";
import type { AllowedVocab, GeminiAuditProposal } from "./types";

const allowed: AllowedVocab = {
  towns: new Set(["Seaside", "Santa Rosa Beach"]),
  areas: new Set(["Seaside"]),
  categories: new Set(["Restaurants", "Coffee shops"]),
};

const input = {
  id: "abc",
  title: "Fake Cafe",
  slug: "fake-cafe",
  is_storefront: "true",
  is_service_business: "false",
  is_verified: "false",
  town: "Seaside",
  area: "",
  category: "Restaurants",
  search_tags: "made_up_tag",
  excerpt: "Invented blurb",
  overview: "Invented overview",
  seo_title: "Fake",
  seo_description: "Fake seo",
  search_keywords: "fake",
  location: "99 Nowhere Rd",
  phone: "555-0000",
  website: "https://not-real.example",
  map_lat: "30.1",
  map_lng: "-86.1",
};

function existsProposal(over: Partial<GeminiAuditProposal> = {}): GeminiAuditProposal {
  return {
    status: "exists",
    confidence: "high",
    title: "Bud & Alley's",
    town: "seaside",
    area: "Seaside",
    category: "Restaurants",
    location: "2236 E County Hwy 30A, Seaside, FL",
    phone: "850-231-5900",
    website: "budandalleys.com",
    excerpt: "Waterfront seafood on the Seaside boardwalk.",
    overview: "A longtime Seaside restaurant on the Gulf with seafood and a rooftop bar.",
    seo_title: "Bud & Alley's in Seaside",
    seo_description: "Waterfront seafood restaurant on the Seaside, 30A boardwalk.",
    search_keywords: "seafood seaside 30a",
    suggested_tags: ["seafood", "waterfront", "family friendly", "rooftop bar"],
    notes: "Official site + Google listing",
    sources: ["https://www.budandalleys.com/"],
    ...over,
  };
}

describe("mergeAuditRow", () => {
  it("stores suggested tags but preserves search_tags for a later match pass", () => {
    const merged = mergeAuditRow(
      input,
      existsProposal({ phone: "", website: "", location: "" }),
      allowed,
    );
    expect(merged.title).toBe("Bud & Alley's");
    expect(merged.search_tags).toBe("made_up_tag");
    expect(merged.audit_suggested_tags).toBe(
      "seafood | waterfront | family friendly | rooftop bar",
    );
    expect(merged.audit_status).toBe("exists");
  });

  it("keeps original content when the business cannot be confirmed", () => {
    const merged = mergeAuditRow(
      input,
      {
        status: "cannot_confirm",
        confidence: "low",
        title: "",
        town: "",
        area: "",
        category: "",
        location: "",
        phone: "",
        website: "",
        excerpt: "",
        overview: "",
        seo_title: "",
        seo_description: "",
        search_keywords: "",
        suggested_tags: [],
        notes: "No matching business",
        sources: [],
      },
      allowed,
    );
    expect(merged.excerpt).toBe("Invented blurb");
    expect(merged.phone).toBe("555-0000");
    expect(merged.audit_status).toBe("cannot_confirm");
  });

  it("does not change verified listings", () => {
    const skipped = skippedVerifiedRow({ ...input, is_verified: "true" });
    expect(skipped.excerpt).toBe("Invented blurb");
    expect(skipped.audit_status).toBe("skipped_verified");
  });
});
