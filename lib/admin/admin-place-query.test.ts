import { describe, expect, it } from "vitest";
import { isOptionalSchemaColumnError } from "@/lib/admin/admin-place-query";

describe("isOptionalSchemaColumnError", () => {
  it("detects missing column errors", () => {
    expect(
      isOptionalSchemaColumnError('column towns.include_on_towns_hub does not exist'),
    ).toBe(true);
    expect(isOptionalSchemaColumnError("Could not find the 'at_a_glance_description' column")).toBe(
      true,
    );
  });

  it("ignores unrelated errors", () => {
    expect(isOptionalSchemaColumnError("Town not found")).toBe(false);
    expect(isOptionalSchemaColumnError("Forbidden")).toBe(false);
  });
});
