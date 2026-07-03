import { describe, expect, it } from "vitest";
import { parseTownSlugsFromParam } from "./parse-town-params";

describe("parseTownSlugsFromParam", () => {
  it("parses comma-separated town slugs", () => {
    expect(parseTownSlugsFromParam("rosemary-beach,seaside")).toEqual([
      "rosemary-beach",
      "seaside",
    ]);
  });

  it("dedupes and trims", () => {
    expect(parseTownSlugsFromParam(" Rosemary-Beach , rosemary-beach ")).toEqual([
      "rosemary-beach",
    ]);
  });
});
