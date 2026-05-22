/** Best-effort text for JSON `hours` blobs (Geoapify, curated strings, future shapes). */
export function summarizeBusinessHours(hours: unknown): string | null {
  if (hours == null) return null;
  if (typeof hours === "string") {
    const s = hours.trim();
    return s.length > 0 ? s : null;
  }
  if (typeof hours === "object" && hours !== null) {
    const o = hours as Record<string, unknown>;

    const stringField = (...keys: string[]): string | null => {
      for (const k of keys) {
        const v = o[k];
        if (typeof v === "string") {
          const t = v.trim();
          if (t.length > 0) return t;
        }
      }
      return null;
    };

    const direct =
      stringField(
        "opening_hours_osm",
        "openingHours",
        "hours_text",
        "hoursText",
        "text",
        "display",
        "label",
        "summary",
        "note",
      ) ?? null;

    if (direct) return direct;

    /** OSM-ish compact blocks from some imports */
    if (Array.isArray(o.weekday_text)) {
      const lines = (o.weekday_text as unknown[])
        .map((line) => (typeof line === "string" ? line.trim() : ""))
        .filter(Boolean);
      if (lines.length > 0) return lines.join("\n");
    }
  }
  return null;
}
