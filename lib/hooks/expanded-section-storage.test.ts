import { describe, expect, it } from "vitest";
import {
  defaultExpandedSectionIds,
  expandedSectionSetsEqual,
  expandedSectionsStorageKey,
  parseStoredExpandedSectionIds,
  sectionIdsFromKey,
  serializeExpandedSectionIds,
} from "@/lib/hooks/expanded-section-storage";

describe("expandedSectionsStorageKey", () => {
  it("scopes storage to pathname", () => {
    expect(expandedSectionsStorageKey("/categories")).toBe(
      "w30a_expanded_sections:/categories",
    );
  });

  it("adds an optional namespace for multiple groups on one page", () => {
    expect(expandedSectionsStorageKey("/business/foo", "content")).toBe(
      "w30a_expanded_sections:/business/foo:content",
    );
    expect(expandedSectionsStorageKey("/business/foo", "cards")).toBe(
      "w30a_expanded_sections:/business/foo:cards",
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

describe("sectionIdsFromKey", () => {
  it("round-trips section id lists", () => {
    expect(sectionIdsFromKey("food\0retail\0services")).toEqual([
      "food",
      "retail",
      "services",
    ]);
    expect(sectionIdsFromKey("")).toEqual([]);
  });
});

describe("expandedSectionSetsEqual", () => {
  it("compares set contents regardless of insertion order", () => {
    expect(expandedSectionSetsEqual(new Set(["a", "b"]), new Set(["b", "a"]))).toBe(true);
    expect(expandedSectionSetsEqual(new Set(["a"]), new Set(["a", "b"]))).toBe(false);
  });
});
