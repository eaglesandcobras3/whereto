import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLANT_WINDOW_DAYS,
  PLANT_MIN_OFFSET_MS,
  isPublishedTipVisible,
  isScheduledPublishedTip,
  plantWindowMs,
  randomFutureTimestamp,
  resolvePlantedCreatedAt,
} from "@/lib/community-tips/schedule";

describe("planted tip schedule", () => {
  const now = new Date("2026-09-22T15:00:00.000Z");

  it("stays inside the window and after the minimum offset", () => {
    const min = randomFutureTimestamp({ now, windowDays: 7, random: () => 0 });
    const max = randomFutureTimestamp({ now, windowDays: 7, random: () => 0.999999 });
    expect(min.getTime()).toBe(now.getTime() + PLANT_MIN_OFFSET_MS);
    expect(max.getTime()).toBeLessThan(now.getTime() + plantWindowMs(7));
    expect(max.getTime()).toBeGreaterThan(now.getTime() + PLANT_MIN_OFFSET_MS);
  });

  it("spreads two draws so a batch is not stamped together", () => {
    const a = randomFutureTimestamp({ now, windowDays: 7, random: () => 0.1 });
    const b = randomFutureTimestamp({ now, windowDays: 7, random: () => 0.8 });
    expect(a.getTime()).not.toBe(b.getTime());
    expect(Math.abs(a.getTime() - b.getTime())).toBeGreaterThan(24 * 60 * 60 * 1000);
  });

  it("publishes immediately when schedule is now", () => {
    expect(resolvePlantedCreatedAt({ schedule: "now", now }).toISOString()).toBe(now.toISOString());
  });

  it("defaults the random window to 7 days", () => {
    expect(DEFAULT_PLANT_WINDOW_DAYS).toBe(7);
    const stamp = resolvePlantedCreatedAt({
      schedule: "random_future",
      now,
      random: () => 0.999999,
    });
    expect(stamp.getTime()).toBeLessThan(now.getTime() + plantWindowMs(7));
  });
});

describe("published tip visibility", () => {
  const now = new Date("2026-09-22T15:00:00.000Z");

  it("hides future-stamped published tips", () => {
    expect(isPublishedTipVisible("published", "2026-09-23T12:00:00.000Z", now)).toBe(false);
    expect(isScheduledPublishedTip("published", "2026-09-23T12:00:00.000Z", now)).toBe(true);
  });

  it("shows published tips at or before now", () => {
    expect(isPublishedTipVisible("published", "2026-09-22T15:00:00.000Z", now)).toBe(true);
    expect(isPublishedTipVisible("published", "2026-09-21T15:00:00.000Z", now)).toBe(true);
    expect(isScheduledPublishedTip("published", "2026-09-21T15:00:00.000Z", now)).toBe(false);
  });

  it("keeps pending tips hidden", () => {
    expect(isPublishedTipVisible("pending", "2026-09-21T15:00:00.000Z", now)).toBe(false);
  });
});
