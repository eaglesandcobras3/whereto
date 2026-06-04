import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://whereto30a.com",
  canonicalSiteHostname: () => "whereto30a.com",
}));

describe("robots.txt", () => {
  it("allows Next.js assets and blocks utility routes", async () => {
    const robots = (await import("@/app/robots")).default;
    const rules = robots();
    const ruleList = Array.isArray(rules.rules)
      ? rules.rules
      : rules.rules
        ? [rules.rules]
        : [];
    const star = ruleList.find((r) => r.userAgent === "*");
    const disallow = star?.disallow ?? [];

    expect(disallow).not.toContain("/_next/");
    expect(disallow).toContain("/search");
    expect(disallow).toContain("/ask");
    expect(disallow).toContain("/share/");
    expect(disallow).toContain("/api/");
  });
});
