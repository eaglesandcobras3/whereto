import { describe, expect, it } from "vitest";
import { nextWeeklyOccurrenceOnOrAfter, weekdayLongName } from "./recurrence";

describe("weekdayLongName", () => {
  it("maps 0–6", () => {
    expect(weekdayLongName(0)).toBe("Sunday");
    expect(weekdayLongName(6)).toBe("Saturday");
  });
});

describe("nextWeeklyOccurrenceOnOrAfter", () => {
  it("returns first matching weekday on or after `from` within season", () => {
    // 2026-06-01 is Monday; first Saturday on/after is 2026-06-06
    expect(nextWeeklyOccurrenceOnOrAfter("2026-06-01", 6, "2026-05-01", "2026-08-31")).toBe("2026-06-06");
  });

  it("returns null when season ends before next match", () => {
    expect(nextWeeklyOccurrenceOnOrAfter("2026-06-10", 6, "2026-05-01", "2026-06-05")).toBe(null);
  });

  it("uses horizon when end_date is null", () => {
    expect(nextWeeklyOccurrenceOnOrAfter("2026-01-04", 0, "2026-01-01", null)).toBe("2026-01-04");
  });
});
