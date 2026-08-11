import { describe, expect, it } from "vitest";
import {
  isNewListingFlag,
  resolveListBusinessMode,
} from "@/lib/listing-requests/list-business-mode";
import { BUSINESS_NAME_SEARCH_DEBOUNCE_MS } from "@/lib/listing-requests/business-name-search-debounce";

describe("resolveListBusinessMode", () => {
  it("prefers slug when business is present", () => {
    expect(resolveListBusinessMode({ business: "seaside-grill", new: "1" })).toBe("slug");
    expect(resolveListBusinessMode({ business: "  seaside-grill  " })).toBe("slug");
  });

  it("uses new mode for new flags", () => {
    expect(resolveListBusinessMode({ new: "1" })).toBe("new");
    expect(resolveListBusinessMode({ new: "true" })).toBe("new");
    expect(resolveListBusinessMode({ new: "" })).toBe("new");
    expect(resolveListBusinessMode({ new: "yes" })).toBe("new");
  });

  it("defaults to find/verify mode", () => {
    expect(resolveListBusinessMode({})).toBe("find");
    expect(resolveListBusinessMode({ new: "0" })).toBe("find");
    expect(resolveListBusinessMode({ business: "   " })).toBe("find");
  });
});

describe("isNewListingFlag", () => {
  it("accepts common truthy encodings", () => {
    expect(isNewListingFlag(null)).toBe(false);
    expect(isNewListingFlag(undefined)).toBe(false);
    expect(isNewListingFlag("no")).toBe(false);
    expect(isNewListingFlag("1")).toBe(true);
    expect(isNewListingFlag("")).toBe(true);
  });
});

describe("business name typeahead debounce", () => {
  it("waits 300ms after typing before searching", () => {
    expect(BUSINESS_NAME_SEARCH_DEBOUNCE_MS).toBe(300);
  });
});
