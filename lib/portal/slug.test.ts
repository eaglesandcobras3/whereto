import { describe, expect, it } from "vitest";
import { slugifyBusinessTitle, uniqueSlug } from "@/lib/portal/slug";

describe("portal slug", () => {
  it("slugifies titles", () => {
    expect(slugifyBusinessTitle("Amavida Coffee & Tea")).toBe("amavida-coffee-tea");
  });

  it("dedupes slugs", () => {
    const taken = new Set(["amavida-coffee"]);
    expect(uniqueSlug("Amavida Coffee", taken)).toBe("amavida-coffee-2");
    expect(taken.has("amavida-coffee-2")).toBe(true);
  });
});
