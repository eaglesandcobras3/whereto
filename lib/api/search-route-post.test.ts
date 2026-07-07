import { describe, it, expect } from "vitest";

import { POST } from "@/app/api/search/route";

describe("POST /api/search", () => {
  it("returns gone for the removed legacy search API", async () => {
    const res = await POST();
    expect(res.status).toBe(410);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    const j = await res.json();
    expect(j.error).toContain("/discover");
  });
});
