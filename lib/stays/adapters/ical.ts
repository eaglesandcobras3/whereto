import type { AdapterAvailabilityDay, RentalSourceAdapter } from "@/lib/stays/adapters/types";

/**
 * iCal provides busy/blocked windows only — never treat missing days as confirmed available.
 */
export function parseIcalBusyDates(icalText: string): string[] {
  const busy = new Set<string>();
  const events = icalText.split("BEGIN:VEVENT");
  for (const chunk of events.slice(1)) {
    const start = matchIcalDate(chunk, "DTSTART");
    const end = matchIcalDate(chunk, "DTEND") ?? start;
    if (!start) continue;
    for (const d of eachDate(start, end ?? start)) {
      // DTEND is exclusive in most iCal feeds
      if (end && d === end) continue;
      busy.add(d);
    }
  }
  return [...busy].sort();
}

function matchIcalDate(chunk: string, key: string): string | null {
  const re = new RegExp(`${key}[^:]*:([0-9]{8})`);
  const m = chunk.match(re);
  if (!m?.[1]) return null;
  const raw = m[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(last.getTime())) return out;
  // Cap to 2 years to avoid runaway
  for (let i = 0; i < 800 && cur < last; i++) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function busyDatesToAvailability(busy: string[]): AdapterAvailabilityDay[] {
  return busy.map((date) => ({ date, isAvailable: false }));
}

export class IcalAvailabilityAdapter implements RentalSourceAdapter {
  readonly sourceType = "ical" as const;
  constructor(
    private readonly icalText: string,
    private readonly externalId: string,
  ) {}

  async listProperties() {
    return [];
  }

  async listAvailability(externalId: string) {
    if (externalId !== this.externalId) return [];
    return busyDatesToAvailability(parseIcalBusyDates(this.icalText));
  }
}
