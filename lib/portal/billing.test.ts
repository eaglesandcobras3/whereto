import { describe, expect, it } from "vitest";
import { effectivePlanSlug } from "@/lib/portal/billing";

describe("effectivePlanSlug", () => {
  it("returns claimed_listing when no row", () => {
    expect(effectivePlanSlug(null)).toBe("claimed_listing");
  });

  it("returns local_partner when active paid plan", () => {
    expect(
      effectivePlanSlug({ plan_slug: "local_partner", status: "active" }),
    ).toBe("local_partner");
  });

  it("returns local_partner when comped", () => {
    expect(
      effectivePlanSlug({ plan_slug: "local_partner", status: "comped" }),
    ).toBe("local_partner");
  });

  it("returns local_partner for past_due grace period", () => {
    expect(
      effectivePlanSlug({ plan_slug: "local_partner", status: "past_due" }),
    ).toBe("local_partner");
  });

  it("returns claimed_listing when canceled even if plan slug remains", () => {
    expect(
      effectivePlanSlug({ plan_slug: "local_partner", status: "canceled" }),
    ).toBe("claimed_listing");
  });
});
