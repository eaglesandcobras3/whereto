import { describe, expect, it } from "vitest";
import { ADMIN_SEARCH_DEBOUNCE_MS } from "@/lib/admin/admin-search-debounce";
import { BUSINESS_NAME_SEARCH_DEBOUNCE_MS } from "@/lib/listing-requests/business-name-search-debounce";

describe("admin search debounce", () => {
  it("waits longer than public intake typeahead", () => {
    expect(ADMIN_SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(
      BUSINESS_NAME_SEARCH_DEBOUNCE_MS,
    );
  });
});
