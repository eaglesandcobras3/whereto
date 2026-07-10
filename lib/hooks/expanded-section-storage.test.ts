import { describe, expect, it } from "vitest";
import {
  defaultExpandedSectionIds,
  expandedSectionsStorageKey,
  parseStoredExpandedSectionIds,
  serializeExpandedSectionIds,
} from "@/lib/hooks/expanded-section-storage";

describe("expandedSectionsStorageKey", () => {
  it("scopes storage to pathname", () => {
    expect(expandedSectionsStorageKey("/categories")).toBe(
      "w30a_expanded_sections:/categories",
    );
  });
});

describe("parseStoredExpandedSectionIds", () => {
  const valid = ["food", "retail", "services"];

  it("returns null for empty or invalid JSON", () => {
    expect(parseStoredExpandedSectionIds(null, valid)).toBeNull();
    expect(parseStoredExpandedSectionIds("{", valid)).toBeNull();
    expect(parseStoredExpandedSectionIds("{}", valid)).toBeNull();
  });

  it("drops ids that are no longer on the page", () => {
    const stored = parseStoredExpandedSectionIds(
      JSON.stringify(["food", "removed", "retail"]),
      valid,
    );
    expect(stored).toEqual(new Set(["food", "retail"]));
  });
});

describe("serializeExpandedSectionIds", () => {
  it("round-trips through parse", () => {
    const ids = new Set(["b", "a"]);
    const parsed = parseStoredExpandedSectionIds(
      serializeExpandedSectionIds(ids),
      ["a", "b", "c"],
    );
    expect(parsed).toEqual(ids);
  });
});

describe("defaultExpandedSectionIds", () => {
  it("expands the first N section ids", () => {
    expect(defaultExpandedSectionIds(["a", "b", "c"], 2)).toEqual(new Set(["a", "b"]));
    expect(defaultExpandedSectionIds(["a"], 3)).toEqual(new Set(["a"]));
  });
});
