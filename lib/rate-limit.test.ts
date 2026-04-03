import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isSearchRateLimited,
  resetSearchRateLimitForTests,
} from "./rate-limit";

describe("isSearchRateLimited", () => {
  beforeEach(() => {
    resetSearchRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("allows up to max then blocks", () => {
    vi.stubEnv("SEARCH_RATE_LIMIT_MAX", "3");
    vi.stubEnv("SEARCH_RATE_LIMIT_WINDOW_SEC", "60");
    expect(isSearchRateLimited("ip-a")).toBe(false);
    expect(isSearchRateLimited("ip-a")).toBe(false);
    expect(isSearchRateLimited("ip-a")).toBe(false);
    expect(isSearchRateLimited("ip-a")).toBe(true);
  });

  it("tracks keys independently", () => {
    vi.stubEnv("SEARCH_RATE_LIMIT_MAX", "1");
    expect(isSearchRateLimited("x")).toBe(false);
    expect(isSearchRateLimited("x")).toBe(true);
    expect(isSearchRateLimited("y")).toBe(false);
  });

  it("is off when DISABLE_SEARCH_RATE_LIMIT=1", () => {
    vi.stubEnv("DISABLE_SEARCH_RATE_LIMIT", "1");
    vi.stubEnv("SEARCH_RATE_LIMIT_MAX", "1");
    expect(isSearchRateLimited("z")).toBe(false);
    expect(isSearchRateLimited("z")).toBe(false);
  });
});
