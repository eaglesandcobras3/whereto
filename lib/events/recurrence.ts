/** 0 = Sunday … 6 = Saturday (same as `Date.getDay()`). */
export type Weekday0to6 = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function weekdayLongName(weekday: number): string {
  const i = Math.max(0, Math.min(6, Math.floor(weekday)));
  return WEEKDAY_LABELS[i] ?? WEEKDAY_LABELS[0];
}

function parseYmd(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Next calendar date (inclusive) matching `weekday` on or after `from`,
 * capped by `seasonEnd` when set. Matches `upcoming_events` weekly logic.
 */
export function nextWeeklyOccurrenceOnOrAfter(
  fromYmd: string,
  weekday: Weekday0to6,
  seasonStartYmd: string,
  seasonEndYmd: string | null,
  horizonDaysWhenNoEnd = 730,
): string | null {
  const seasonStart = parseYmd(seasonStartYmd);
  let cursor = parseYmd(fromYmd);
  if (cursor < seasonStart) cursor = seasonStart;

  const cap = seasonEndYmd
    ? parseYmd(seasonEndYmd)
    : addDays(seasonStart, horizonDaysWhenNoEnd);

  while (cursor <= cap) {
    if (cursor.getDay() === weekday) return formatYmd(cursor);
    cursor = addDays(cursor, 1);
  }
  return null;
}
