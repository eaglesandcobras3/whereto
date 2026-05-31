import "server-only";

/**
 * Ambient context for Ask searches — weather, time-of-day, season, crowd, and today's events.
 *
 * Weather: Open-Meteo (free, no key needed) for 30A corridor.
 * Events: Supabase events_view for today's happenings.
 * Season + crowd: inferred from calendar date.
 * Time-of-day: inferred from current hour (America/Chicago timezone).
 *
 * Cached 30 minutes per process — no cost per Ask turn.
 * Informs: clarifying questions, search strategy, LLM system prompt.
 */

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { timeOfDayLabel } from "@/lib/ask/ambient-search";

// 30A corridor center: Santa Rosa Beach
const LAT = 30.284;
const LON = -86.022;
const TZ = "America/Chicago";

// WMO Weather Interpretation Codes → readable condition
const WMO_CONDITION: Record<number, "clear" | "partly_cloudy" | "cloudy" | "drizzle" | "rain" | "storm"> = {
  0: "clear", 1: "clear", 2: "partly_cloudy", 3: "cloudy",
  45: "cloudy", 48: "cloudy",
  51: "drizzle", 53: "drizzle", 55: "drizzle",
  61: "rain", 63: "rain", 65: "rain",
  71: "rain", 73: "rain", 75: "rain",
  80: "rain", 81: "rain", 82: "rain",
  85: "rain", 86: "rain",
  95: "storm", 96: "storm", 99: "storm",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeatherCondition = "clear" | "partly_cloudy" | "cloudy" | "drizzle" | "rain" | "storm" | "unknown";
export type Season = "peak_summer" | "spring_break" | "shoulder_busy" | "shoulder_quiet" | "offseason";
export type CrowdLevel = "very_busy" | "busy" | "moderate" | "quiet";
export type TimeOfDay = "morning" | "midday" | "afternoon" | "golden_hour" | "evening" | "night";

export type TodayEvent = {
  title: string;
  locationName: string | null;
  timeLabel: string | null;
  isRecurring: boolean;
};

export type AmbientContext = {
  weather: {
    condition: WeatherCondition;
    temperatureF: number | null;
    isHot: boolean;
    isVeryHot: boolean;
    isRainy: boolean;
    isStormy: boolean;
    isCool: boolean;
  };
  timeOfDay: TimeOfDay;
  /** Hour 0-23 in America/Chicago */
  hourLocal: number;
  season: Season;
  crowdLevel: CrowdLevel;
  isPeakWeekend: boolean;
  /** Day of week 0-6 (Sun-Sat) */
  dayOfWeek: number;
  todayEvents: TodayEvent[];
  /** Ready-to-use hints for the LLM system prompt */
  contextHints: string[];
  /** Signals that influence search strategies and clarifying questions */
  searchSignals: {
    preferIndoor: boolean;
    preferCold: boolean;
    preferShaded: boolean;
    avoidCrowded: boolean;
    seasonClosed: boolean;
    /** Best guess at intended meal period from time of day */
    impliedMealPeriod: "breakfast" | "lunch" | "dinner" | "late_night" | null;
    /** Afternoon thunderstorm window (2–5pm summer) */
    stormWindow: boolean;
    /** Happy hour window (5–8pm) */
    happyHour: boolean;
    /** 7–10am — coffee/breakfast peak */
    preferCoffeePeak: boolean;
    /** 8pm+ — bars/nightlife */
    preferNightlife: boolean;
    /** Afternoon vague food ask — light bite/café, not full dinner */
    suggestLightBite: boolean;
  };
  fetchedAt: number;
};

// ---------------------------------------------------------------------------
// Cache — 30-min TTL
// ---------------------------------------------------------------------------

let cache: AmbientContext | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Time of day
// ---------------------------------------------------------------------------

function getLocalHour(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const hourStr = parts.find((p) => p.type === "hour")?.value ?? "12";
    return parseInt(hourStr, 10);
  } catch {
    return new Date().getHours();
  }
}

function getLocalDayOfWeek(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
    }).formatToParts(new Date());
    const day = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
  } catch {
    return new Date().getDay();
  }
}

function inferTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "golden_hour";
  if (hour >= 20 && hour < 23) return "evening";
  return "night";
}

function impliedMealPeriod(tod: TimeOfDay): AmbientContext["searchSignals"]["impliedMealPeriod"] {
  switch (tod) {
    case "morning": return "breakfast";
    case "midday": return "lunch";
    case "afternoon": return null; // could go either way
    case "golden_hour": return "dinner"; // early dinner / happy hour
    case "evening": return "dinner";
    case "night": return "late_night";
  }
}

// ---------------------------------------------------------------------------
// Season and crowd
// ---------------------------------------------------------------------------

function inferSeasonAndCrowd(now: Date): { season: Season; crowdLevel: CrowdLevel; isPeakWeekend: boolean } {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dow = now.getDay();
  const isWeekend = dow === 0 || dow === 5 || dow === 6;

  const is4thWeek = (month === 6 && day >= 28) || (month === 7 && day <= 7);
  const isMemorialDay = month === 5 && day >= 23 && day <= 31 && isWeekend;
  const isLaborDay = month === 9 && day <= 7 && isWeekend;
  const isSpringBreak = (month === 3 && day >= 8) || (month === 4 && day <= 7);
  const isThanksgiving = month === 11 && day >= 21 && day <= 30;
  const isHoliday = (month === 12 && day >= 22) || (month === 1 && day <= 5);

  let season: Season;
  let crowdLevel: CrowdLevel;
  let isPeakWeekend = false;

  if (isSpringBreak) {
    season = "spring_break"; crowdLevel = "busy";
  } else if (month >= 6 && month <= 8) {
    season = "peak_summer";
    crowdLevel = is4thWeek ? "very_busy" : isWeekend ? "very_busy" : "busy";
    isPeakWeekend = isWeekend;
  } else if (isMemorialDay || isLaborDay) {
    season = "shoulder_busy"; crowdLevel = "very_busy"; isPeakWeekend = true;
  } else if (month === 5 || month === 9 || month === 10) {
    season = "shoulder_busy"; crowdLevel = isWeekend ? "moderate" : "quiet";
  } else if (isThanksgiving || isHoliday) {
    season = "shoulder_quiet"; crowdLevel = "moderate";
  } else {
    season = "offseason"; crowdLevel = isWeekend ? "moderate" : "quiet";
  }

  return { season, crowdLevel, isPeakWeekend };
}

// ---------------------------------------------------------------------------
// Weather fetch
// ---------------------------------------------------------------------------

async function fetchWeather(): Promise<AmbientContext["weather"]> {
  const fallback: AmbientContext["weather"] = {
    condition: "unknown", temperatureF: null,
    isHot: false, isVeryHot: false, isRainy: false, isStormy: false, isCool: false,
  };
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weathercode,precipitation&temperature_unit=fahrenheit&timezone=${encodeURIComponent(TZ)}&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return fallback;
    const data = await res.json() as { current?: { temperature_2m?: number; weathercode?: number } };
    const cur = data.current;
    if (!cur) return fallback;
    const tempF = typeof cur.temperature_2m === "number" ? Math.round(cur.temperature_2m) : null;
    const condition: WeatherCondition = WMO_CONDITION[cur.weathercode ?? 0] ?? "unknown";
    return {
      condition, temperatureF: tempF,
      isHot: tempF !== null && tempF >= 85,
      isVeryHot: tempF !== null && tempF >= 92,
      isRainy: condition === "rain" || condition === "drizzle",
      isStormy: condition === "storm",
      isCool: tempF !== null && tempF < 65,
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Events fetch — today's events and recurring events active today
// ---------------------------------------------------------------------------

function formatTimeLabel(startsAt: string | null): string | null {
  if (!startsAt) return null;
  try {
    const d = new Date(startsAt);
    return d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return null;
  }
}

// Day abbreviation from recurrence_rule string (handles "WEEKLY:SAT", "BYDAY=SA", "saturday", etc.)
const DAY_NAMES: [RegExp, number][] = [
  [/\b(su|sun|sunday)\b/i, 0],
  [/\b(mo|mon|monday)\b/i, 1],
  [/\b(tu|tue|tuesday)\b/i, 2],
  [/\b(we|wed|wednesday)\b/i, 3],
  [/\b(th|thu|thursday)\b/i, 4],
  [/\b(fr|fri|friday)\b/i, 5],
  [/\b(sa|sat|saturday)\b/i, 6],
];

function weekdayFromRecurrenceRule(rule: string | null): number | null {
  if (!rule) return null;
  for (const [pattern, dow] of DAY_NAMES) {
    if (pattern.test(rule)) return dow;
  }
  return null;
}

async function fetchTodayEvents(dayOfWeek: number): Promise<TodayEvent[]> {
  try {
    const supabase = getServiceSupabase();
    const nowIso = new Date().toISOString();
    const endOfDayIso = endOfLocalDayIso();

    // One-time events happening later today
    const { data: oneTime } = await supabase
      .from("events_view")
      .select("title, location_name, starts_at, recurrence_rule")
      .is("archived_at", null)
      .eq("status", "published")
      .gte("starts_at", nowIso)
      .lte("starts_at", endOfDayIso)
      .is("recurrence_rule", null)
      .order("starts_at", { ascending: true })
      .limit(8);

    // Recurring events (farmers markets, weekly concerts) — filter by weekday
    const { data: recurring } = await supabase
      .from("events_view")
      .select("title, location_name, starts_at, recurrence_rule")
      .is("archived_at", null)
      .eq("status", "published")
      .not("recurrence_rule", "is", null)
      .limit(40);

    const events: TodayEvent[] = [];

    for (const e of (oneTime ?? []) as { title: string; location_name: string | null; starts_at: string | null; recurrence_rule: string | null }[]) {
      events.push({
        title: e.title,
        locationName: e.location_name,
        timeLabel: formatTimeLabel(e.starts_at),
        isRecurring: false,
      });
    }

    for (const e of (recurring ?? []) as { title: string; location_name: string | null; starts_at: string | null; recurrence_rule: string | null }[]) {
      const dow = weekdayFromRecurrenceRule(e.recurrence_rule);
      if (dow === dayOfWeek) {
        events.push({
          title: e.title,
          locationName: e.location_name,
          timeLabel: formatTimeLabel(e.starts_at),
          isRecurring: true,
        });
      }
    }

    return events.slice(0, 8);
  } catch {
    return [];
  }
}

/** End of today in America/Chicago as ISO string. */
function endOfLocalDayIso(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    // 23:59:59 Chicago — approximate via offset (good enough for event window)
    return new Date(`${y}-${m}-${d}T23:59:59-05:00`).toISOString();
  } catch {
    return new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  }
}

// ---------------------------------------------------------------------------
// Context hints
// ---------------------------------------------------------------------------

function buildContextHints(ctx: Omit<AmbientContext, "contextHints" | "searchSignals" | "fetchedAt">): string[] {
  const hints: string[] = [];
  const { weather, timeOfDay, hourLocal, season, crowdLevel, isPeakWeekend, todayEvents } = ctx;

  // ── Weather ──
  if (weather.isStormy) {
    hints.push("⛈ Storms on 30A right now — proactively recommend indoor options.");
  } else if (weather.isRainy) {
    hints.push("🌧 It's raining — lean toward indoor spots: coffee shops, bookstores, indoor dining, galleries.");
  } else if (weather.isVeryHot && weather.temperatureF) {
    hints.push(`🥵 ${weather.temperatureF}°F — very hot. Recommend cold treats, shaded patios, or A/C spots. Mention beating the heat.`);
  } else if (weather.isHot && weather.temperatureF) {
    hints.push(`☀️ ${weather.temperatureF}°F and sunny. Suggest cold drinks or ice cream alongside any food rec.`);
  } else if (weather.isCool && weather.temperatureF) {
    hints.push(`🌤 A cooler ${weather.temperatureF}°F — great for outdoor activities and walking towns.`);
  }

  // ── Time of day (30A hourly patterns) ──
  hints.push(`🕐 Right now (${hourLocal}:00): ${timeOfDayLabel(timeOfDay)}.`);

  if (timeOfDay === "morning") {
    hints.push("🌅 Morning — breakfast spots and coffee shops are peaking. Suggest cafés before the beach crowd builds.");
  } else if (timeOfDay === "midday") {
    hints.push("☀️ Midday — most people are at the beach. Light lunch spots and quick bites beat a big sit-down meal.");
  } else if (timeOfDay === "afternoon" && (season === "peak_summer" || season === "spring_break")) {
    hints.push(
      "⛈ Afternoon storm window (2–5pm) — very common June–August. Suggest indoor options, covered patios, or a café to wait it out. Full dinner is still 2+ hours away.",
    );
  } else if (timeOfDay === "afternoon") {
    hints.push("⛅ Afternoon — good window for coffee, shopping, or an early snack before evening plans.");
  } else if (timeOfDay === "golden_hour") {
    hints.push("🌅 Golden hour (5–8pm) — happy hour and early dinner. Waterfront bars and sunset spots fill fast.");
  } else if (timeOfDay === "evening") {
    hints.push("🌙 Evening — dinner rush. At peak season, suggest walk-in friendly spots or calling ahead.");
  } else if (timeOfDay === "night") {
    hints.push("🌃 Late night — bars and nightlife only. Most restaurants are closed.");
  }

  // ── Season / crowd ──
  if (season === "peak_summer" && crowdLevel === "very_busy") {
    hints.push("📅 Peak summer — 30A is extremely crowded. Suggest arriving early, less-touristed spots, or off-peak timing.");
  } else if (season === "peak_summer") {
    hints.push("📅 Peak summer — busy but manageable on weekdays. Weekday mornings and early afternoons are best.");
  } else if (season === "spring_break") {
    hints.push("📅 Spring break — 30A is busy. Off-the-beaten-path options or early arrival recommended.");
  } else if (isPeakWeekend) {
    hints.push("📅 Peak holiday weekend — popular spots will have waits. Mention that upfront.");
  } else if (season === "offseason" && crowdLevel === "quiet") {
    hints.push("📅 Quiet season — some seasonal businesses may have reduced hours or be closed. Suggest calling ahead.");
  }

  // ── Today's events ──
  if (todayEvents.length > 0) {
    const eventLines = todayEvents.map((e) => {
      const where = e.locationName ? ` at ${e.locationName}` : "";
      const when = e.timeLabel ? ` (${e.timeLabel})` : e.isRecurring ? " (weekly)" : "";
      return `${e.title}${where}${when}`;
    });
    hints.push(`🎪 Today on 30A: ${eventLines.join(" • ")}`);
    hints.push("If the user's query relates to any of these events, surface them in your response.");
  }

  return hints;
}

function buildSearchSignals(ctx: Pick<AmbientContext, "weather" | "season" | "crowdLevel" | "timeOfDay" | "hourLocal">): AmbientContext["searchSignals"] {
  const { weather, season, crowdLevel, timeOfDay, hourLocal } = ctx;
  const isSummerSeason =
    season === "peak_summer" || season === "spring_break" || season === "shoulder_busy";
  const isStormSeasonAfternoon =
    isSummerSeason && hourLocal >= 14 && hourLocal < 17;
  const isBreakfastWindow = hourLocal >= 7 && hourLocal < 11;
  const isLunchWindow = hourLocal >= 11 && hourLocal < 14;

  return {
    preferIndoor: weather.isRainy || weather.isStormy || isStormSeasonAfternoon,
    preferCold: weather.isHot || weather.isVeryHot,
    preferShaded: weather.isVeryHot,
    avoidCrowded: crowdLevel === "very_busy",
    seasonClosed: season === "offseason",
    impliedMealPeriod: impliedMealPeriod(timeOfDay),
    stormWindow: isStormSeasonAfternoon,
    happyHour: hourLocal >= 17 && hourLocal < 20,
    preferCoffeePeak: isBreakfastWindow,
    preferNightlife: hourLocal >= 20,
    suggestLightBite: isStormSeasonAfternoon || (timeOfDay === "afternoon" && !isLunchWindow),
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/** Fetch ambient context with 30-minute cache. Never throws. */
export async function getAmbientContext(): Promise<AmbientContext> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache;

  const hourLocal = getLocalHour();
  const dayOfWeek = getLocalDayOfWeek();
  const timeOfDay = inferTimeOfDay(hourLocal);
  const { season, crowdLevel, isPeakWeekend } = inferSeasonAndCrowd(new Date());

  const [weather, todayEvents] = await Promise.all([
    fetchWeather(),
    fetchTodayEvents(dayOfWeek),
  ]);

  const partial = { weather, timeOfDay, hourLocal, season, crowdLevel, isPeakWeekend, dayOfWeek, todayEvents };
  const contextHints = buildContextHints(partial);
  const searchSignals = buildSearchSignals(partial);

  cache = { ...partial, contextHints, searchSignals, fetchedAt: now };
  return cache;
}

/** Format ambient context for the LLM system prompt. */
export function formatAmbientContextForPrompt(ctx: AmbientContext): string {
  if (!ctx.contextHints.length) return "";
  return `\nCURRENT CONDITIONS ON 30A:\n${ctx.contextHints.join("\n")}`;
}
