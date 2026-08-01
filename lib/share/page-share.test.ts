import { describe, expect, it, vi } from "vitest";
import {
  buildPageSharePayload,
  buildShareEmailHref,
  canUseNativeShare,
  canonicalPageUrl,
  pageShareMessage,
  pageShareTitle,
  stripUrlQueryAndHash,
} from "@/lib/share/page-share";

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://whereto30a.com",
}));

describe("pageShareTitle", () => {
  it("formats title with site name", () => {
    expect(pageShareTitle("Seaside")).toBe("Seaside | WhereTo30A");
  });
});

describe("pageShareMessage", () => {
  it("formats short share message", () => {
    expect(pageShareMessage("Seaside")).toBe("Check out Seaside on WhereTo30A.");
  });
});

describe("canonicalPageUrl", () => {
  it("joins site origin with path and strips query/hash", () => {
    expect(canonicalPageUrl("/town/seaside?utm=1#top")).toBe(
      "https://whereto30a.com/town/seaside",
    );
  });

  it("normalizes missing leading slash", () => {
    expect(canonicalPageUrl("business/starbucks")).toBe(
      "https://whereto30a.com/business/starbucks",
    );
  });

  it("respects an explicit origin override", () => {
    expect(canonicalPageUrl("/town/seaside", "https://preview.example")).toBe(
      "https://preview.example/town/seaside",
    );
  });
});

describe("stripUrlQueryAndHash", () => {
  it("removes search and hash from absolute URLs", () => {
    expect(stripUrlQueryAndHash("https://whereto30a.com/guide/a?x=1#y")).toBe(
      "https://whereto30a.com/guide/a",
    );
  });
});

describe("buildPageSharePayload", () => {
  it("builds title, text, and canonical url", () => {
    expect(
      buildPageSharePayload({
        pageName: "Grayton Beach",
        path: "/area/grayton-beach?ref=nav",
      }),
    ).toEqual({
      title: "Grayton Beach | WhereTo30A",
      text: "Check out Grayton Beach on WhereTo30A.",
      url: "https://whereto30a.com/area/grayton-beach",
    });
  });
});

describe("buildShareEmailHref", () => {
  it("encodes subject and body with url", () => {
    const href = buildShareEmailHref({
      title: "Seaside | WhereTo30A",
      text: "Check out Seaside on WhereTo30A.",
      url: "https://whereto30a.com/town/seaside",
    });
    expect(href.startsWith("mailto:?")).toBe(true);
    expect(href).toContain("subject=Seaside%20%7C%20WhereTo30A");
    expect(href).toContain(encodeURIComponent("Check out Seaside on WhereTo30A."));
    expect(href).toContain(encodeURIComponent("https://whereto30a.com/town/seaside"));
  });
});

describe("canUseNativeShare", () => {
  it("returns false when navigator.share is missing", () => {
    expect(canUseNativeShare({} as ShareCapabilityNavigator)).toBe(false);
  });

  it("returns true when share is a function", () => {
    expect(
      canUseNativeShare({
        share: async () => undefined,
      } as ShareCapabilityNavigator),
    ).toBe(true);
  });
});

type ShareCapabilityNavigator = Parameters<typeof canUseNativeShare>[0];
