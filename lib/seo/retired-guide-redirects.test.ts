import { describe, expect, it } from "vitest";
import {
  BEACH_ACCESS_PILLAR_GUIDE_PATH,
  RETIRED_GUIDE_REDIRECTS,
  retiredGuideRedirectRules,
} from "./retired-guide-redirects";

describe("retiredGuideRedirectRules", () => {
  it("maps beach-access variants to the pillar guide", () => {
    expect(
      RETIRED_GUIDE_REDIRECTS[
        "30a-public-beach-access-map-find-the-best-spots-to-hit-the-sand"
      ],
    ).toBe(BEACH_ACCESS_PILLAR_GUIDE_PATH);
  });

  it("emits one Next.js rule per retired slug", () => {
    const rules = retiredGuideRedirectRules();
    expect(rules.length).toBe(Object.keys(RETIRED_GUIDE_REDIRECTS).length);
    for (const rule of rules) {
      expect(rule.source).toMatch(/^\/guide\//);
      expect(rule.permanent).toBe(true);
    }
  });
});
