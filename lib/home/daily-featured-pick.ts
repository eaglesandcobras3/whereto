/**
 * Deterministic daily rotation for homepage featured listings.
 * Same **calendar day in `America/Chicago`** ⇒ same subset; next local day ⇒ different shuffle.
 */

export const FEATURED_ROTATION_TIME_ZONE = "America/Chicago" as const;

/** Y-M-D as seen on the clock in `timeZone` at instant `now`. */
export function calendarDatePartsInTimeZone(
  now: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = f.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  return { year, month, day };
}

/**
 * Compact integer seed for one calendar day in Chicago (YYYYMMDD, e.g. 20260424).
 * Drives deterministic shuffle; same seed ⇒ same ordering.
 */
export function chicagoCalendarDaySeed(now = new Date()): number {
  const { year, month, day } = calendarDatePartsInTimeZone(now, FEATURED_ROTATION_TIME_ZONE);
  return year * 10_000 + month * 100 + day;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pick up to `limit` items from `pool`; order changes each **Chicago** calendar day.
 */
export function pickDailySubset<T>(pool: T[], limit: number, now = new Date()): T[] {
  if (pool.length <= limit) return pool;
  const seed = chicagoCalendarDaySeed(now);
  return shuffleDeterministic(pool, seed).slice(0, limit);
}

function hashSaltIntoSeed(baseSeed: number, salt: string): number {
  let h = baseSeed >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

/**
 * Daily subset with a stable salt (e.g. category slug) so each bucket shuffles independently.
 */
export function pickDailySubsetWithSalt<T>(
  pool: T[],
  limit: number,
  salt: string,
  now = new Date(),
): T[] {
  if (pool.length <= limit) return pool;
  const seed = hashSaltIntoSeed(chicagoCalendarDaySeed(now), salt);
  return shuffleDeterministic(pool, seed).slice(0, limit);
}
