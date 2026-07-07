import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { assertCronAuthorized } from "./cron-auth";

describe("assertCronAuthorized", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows when CRON_SECRET unset in development", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    const req = new NextRequest("http://localhost/api/cron/cache-prune");
    expect(() => assertCronAuthorized(req)).not.toThrow();
  });

  it("throws when CRON_SECRET unset outside development", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const req = new NextRequest("http://localhost/api/cron/cache-prune");
    expect(() => assertCronAuthorized(req)).toThrow("CRON_SECRET is not set");
  });

  it("accepts Bearer token", () => {
    vi.stubEnv("CRON_SECRET", "secret-value");
    vi.stubEnv("NODE_ENV", "production");
    const req = new NextRequest("http://localhost/api/cron/cache-prune", {
      headers: { authorization: "Bearer secret-value" },
    });
    expect(() => assertCronAuthorized(req)).not.toThrow();
  });

  it("accepts ?secret= query", () => {
    vi.stubEnv("CRON_SECRET", "secret-value");
    vi.stubEnv("NODE_ENV", "production");
    const req = new NextRequest(
      "http://localhost/api/cron/cache-prune?secret=secret-value",
    );
    expect(() => assertCronAuthorized(req)).not.toThrow();
  });

  it("rejects wrong secret", () => {
    vi.stubEnv("CRON_SECRET", "right");
    vi.stubEnv("NODE_ENV", "production");
    const req = new NextRequest("http://localhost/api/cron/cache-prune", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(() => assertCronAuthorized(req)).toThrow("Unauthorized cron");
  });
});
