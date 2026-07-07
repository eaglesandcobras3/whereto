import { describe, expect, it } from "vitest";
import {
  extractTownFromNormalizedQuery,
  extractTownsFromNormalizedQuery,
} from "@/lib/ai/town-query-aliases";

describe("extractTownsFromNormalizedQuery", () => {
  it("extracts multiple towns from comma/and lists", () => {
    expect(
      extractTownsFromNormalizedQuery("donuts in rosemary seaside and alys"),
    ).toEqual(["rosemary-beach", "seaside", "alys-beach"]);
  });

  it("extracts multiple towns joined with or", () => {
    expect(
      extractTownsFromNormalizedQuery("coffee in rosemary or seaside or grayton"),
    ).toEqual(["rosemary-beach", "seaside", "grayton-beach"]);
  });

  it("returns a single town for one-town queries", () => {
    expect(extractTownsFromNormalizedQuery("donuts near rosemary")).toEqual([
      "rosemary-beach",
    ]);
  });

  it("preserves left-to-right order", () => {
    expect(
      extractTownsFromNormalizedQuery("lunch in grayton seaside and rosemary"),
    ).toEqual(["grayton-beach", "seaside", "rosemary-beach"]);
  });
});

describe("extractTownFromNormalizedQuery", () => {
  it("returns the first town mention", () => {
    expect(extractTownFromNormalizedQuery("coffee in seaside or rosemary")).toBe(
      "seaside",
    );
  });
});
