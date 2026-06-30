import { describe, expect, it } from "vitest";
import {
  HOME_HERO_IMAGE_PATH,
  isLegacyHomeHeroPlaceholder,
  resolveHomeHeroImageUrl,
} from "@/lib/home/hero-image";

describe("resolveHomeHeroImageUrl", () => {
  it("uses the local hero when env is unset", () => {
    expect(resolveHomeHeroImageUrl(undefined)).toBe(HOME_HERO_IMAGE_PATH);
    expect(resolveHomeHeroImageUrl("")).toBe(HOME_HERO_IMAGE_PATH);
  });

  it("replaces legacy Google placeholder URLs", () => {
    const legacy =
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCsXovFV1neXjTq-4mDbgPnbeulhSJTjrnA8HjhYxq8ia7daxCG_LgukxpGv4QFsulirvaswIA6YRwYJFSNId1ug0GSb0xSB5vMk2oIfL018BIDjnqCxf8mngM3LnJVaLLOz3m0qpr65y-xGAT3ZUZZY-fO437YIwlfzKPcpingFhsBIKN7sgwtVTuDefQ2_q6okMXgBEOT4EPmHvjNaVcN3NqSIl8bkXfWsg_h-MxXYQMT-vBNtntZc6L7fARzSUTdkBnVQMREwlc";
    expect(isLegacyHomeHeroPlaceholder(legacy)).toBe(true);
    expect(resolveHomeHeroImageUrl(legacy)).toBe(HOME_HERO_IMAGE_PATH);
  });

  it("keeps explicit custom hero URLs", () => {
    expect(resolveHomeHeroImageUrl("https://cdn.example.com/custom-hero.webp")).toBe(
      "https://cdn.example.com/custom-hero.webp",
    );
  });
});
