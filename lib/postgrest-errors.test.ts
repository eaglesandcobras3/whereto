import { describe, expect, it } from "vitest";
import { isMissingRelationError } from "@/lib/postgrest-errors";

describe("isMissingRelationError", () => {
  it("matches PostgREST missing relation code", () => {
    expect(
      isMissingRelationError({
        code: "PGRST205",
        message: "Could not find the table 'public.seo_pages' in the schema cache",
        details: null,
        hint: null,
      }),
    ).toBe(true);
  });

  it("ignores other errors", () => {
    expect(
      isMissingRelationError({
        code: "42501",
        message: "permission denied",
        details: null,
        hint: null,
      }),
    ).toBe(false);
    expect(isMissingRelationError(null)).toBe(false);
  });
});
