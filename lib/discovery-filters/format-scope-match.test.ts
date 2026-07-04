import { describe, expect, it } from "vitest";
import { formatScopeMatchNote } from "./format-scope-match";

describe("formatScopeMatchNote", () => {
  it("notes when a listing is outside the preferred scope", () => {
    expect(
      formatScopeMatchNote(
        { entity_type_match: false, category_match: false },
        "storefront",
        true,
      ),
    ).toBe("Service provider · Different category");
  });

  it("returns null when the listing matches the preferred scope", () => {
    expect(
      formatScopeMatchNote(
        { entity_type_match: true, category_match: true },
        "storefront",
        true,
      ),
    ).toBeNull();
  });
});
