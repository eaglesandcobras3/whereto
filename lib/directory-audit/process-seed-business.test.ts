import { describe, expect, it } from "vitest";
import { validateSeedBusinessInput } from "@/lib/directory-audit/process-seed-business";

describe("validateSeedBusinessInput", () => {
  it("requires title", () => {
    expect(
      validateSeedBusinessInput({
        title: "  ",
        town: "Grayton Beach",
        area: "",
        is_storefront: true,
        is_service_business: false,
      }),
    ).toMatch(/title/i);
  });

  it("requires storefront or service", () => {
    expect(
      validateSeedBusinessInput({
        title: "Acme",
        town: "",
        area: "",
        is_storefront: false,
        is_service_business: false,
      }),
    ).toMatch(/storefront|service/i);
  });

  it("requires town for storefront", () => {
    expect(
      validateSeedBusinessInput({
        title: "Acme Cafe",
        town: "",
        area: "",
        is_storefront: true,
        is_service_business: false,
      }),
    ).toMatch(/town/i);
  });

  it("allows blank town for service-only", () => {
    expect(
      validateSeedBusinessInput({
        title: "Roger Realtor",
        town: "",
        area: "",
        is_storefront: false,
        is_service_business: true,
      }),
    ).toBeNull();
  });

  it("rejects area on service-only", () => {
    expect(
      validateSeedBusinessInput({
        title: "Roger Realtor",
        town: "",
        area: "Somewhere",
        is_storefront: false,
        is_service_business: true,
      }),
    ).toMatch(/area/i);
  });
});
