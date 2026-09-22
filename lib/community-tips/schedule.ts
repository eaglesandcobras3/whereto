/** Admin-planted tips can go live at a staggered future stamp without a cron. */

export const PLANT_WINDOW_DAYS = [1, 3, 7, 14, 30] as const;
export type PlantWindowDays = (typeof PLANT_WINDOW_DAYS)[number];

export const DEFAULT_PLANT_WINDOW_DAYS: PlantWindowDays = 7;

/** Earliest offset so a batch planted together does not all appear immediately. */
export const PLANT_MIN_OFFSET_MS = 60 * 60 * 1000;

export function isPlantWindowDays(value: number): value is PlantWindowDays {
  return (PLANT_WINDOW_DAYS as readonly number[]).includes(value);
}

export function plantWindowMs(windowDays: number): number {
  const days = isPlantWindowDays(windowDays) ? windowDays : DEFAULT_PLANT_WINDOW_DAYS;
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Uniform random timestamp between +1 hour and +windowDays.
 * Pass `random` in tests (0 inclusive, 1 exclusive).
 */
export function randomFutureTimestamp(options?: {
  now?: Date;
  windowDays?: number;
  random?: () => number;
}): Date {
  const now = options?.now ?? new Date();
  const windowDays = options?.windowDays ?? DEFAULT_PLANT_WINDOW_DAYS;
  const random = options?.random ?? Math.random;
  const maxOffset = plantWindowMs(windowDays);
  const span = Math.max(maxOffset - PLANT_MIN_OFFSET_MS, 1);
  const unit = Math.min(Math.max(random(), 0), 0.999999);
  return new Date(now.getTime() + PLANT_MIN_OFFSET_MS + unit * span);
}

export function resolvePlantedCreatedAt(options: {
  schedule: "now" | "random_future";
  windowDays?: number;
  now?: Date;
  random?: () => number;
}): Date {
  const now = options.now ?? new Date();
  if (options.schedule === "now") return now;
  return randomFutureTimestamp({
    now,
    windowDays: options.windowDays,
    random: options.random,
  });
}

/** Published tips with a future created_at stay hidden until that stamp. */
export function isPublishedTipVisible(
  status: string,
  createdAt: string,
  now: Date = new Date(),
): boolean {
  if (status !== "published") return false;
  const stamp = Date.parse(createdAt);
  if (!Number.isFinite(stamp)) return false;
  return stamp <= now.getTime();
}

export function isScheduledPublishedTip(
  status: string,
  createdAt: string,
  now: Date = new Date(),
): boolean {
  if (status !== "published") return false;
  const stamp = Date.parse(createdAt);
  if (!Number.isFinite(stamp)) return false;
  return stamp > now.getTime();
}
