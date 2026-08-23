/** Shared at-a-glance form shape for admin town/area edit. */

export type AdminAtAGlanceValues = {
  at_a_glance_description: string;
  walkability_rating: string;
  walkability_subtext: string;
  beach_type: string;
  beach_type_subtext: string;
  dining_rating: string;
  dining_subtext: string;
  getting_around_summary: string;
  getting_around_subtext: string;
  /** One highlight per line in the admin UI. */
  highlightsText: string;
  beach_access_details: string;
  getting_around_details: string;
  dining_town_center_details: string;
  parking_details: string;
};

export const EMPTY_ADMIN_AT_A_GLANCE: AdminAtAGlanceValues = {
  at_a_glance_description: "",
  walkability_rating: "",
  walkability_subtext: "",
  beach_type: "",
  beach_type_subtext: "",
  dining_rating: "",
  dining_subtext: "",
  getting_around_summary: "",
  getting_around_subtext: "",
  highlightsText: "",
  beach_access_details: "",
  getting_around_details: "",
  dining_town_center_details: "",
  parking_details: "",
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function highlightsToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

export function atAGlanceValuesFromRow(row: Record<string, unknown>): AdminAtAGlanceValues {
  return {
    at_a_glance_description: str(row.at_a_glance_description),
    walkability_rating: str(row.walkability_rating),
    walkability_subtext: str(row.walkability_subtext),
    beach_type: str(row.beach_type),
    beach_type_subtext: str(row.beach_type_subtext),
    dining_rating: str(row.dining_rating),
    dining_subtext: str(row.dining_subtext),
    getting_around_summary: str(row.getting_around_summary),
    getting_around_subtext: str(row.getting_around_subtext),
    highlightsText: highlightsToText(row.highlights),
    beach_access_details: str(row.beach_access_details),
    getting_around_details: str(row.getting_around_details),
    dining_town_center_details: str(row.dining_town_center_details),
    parking_details: str(row.parking_details),
  };
}

export function atAGlancePatchFromValues(values: AdminAtAGlanceValues): Record<string, unknown> {
  const highlights = values.highlightsText
    .split(/\n|\s*\|\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  return {
    at_a_glance_description: values.at_a_glance_description,
    walkability_rating: values.walkability_rating,
    walkability_subtext: values.walkability_subtext,
    beach_type: values.beach_type,
    beach_type_subtext: values.beach_type_subtext,
    dining_rating: values.dining_rating,
    dining_subtext: values.dining_subtext,
    getting_around_summary: values.getting_around_summary,
    getting_around_subtext: values.getting_around_subtext,
    highlights,
    beach_access_details: values.beach_access_details,
    getting_around_details: values.getting_around_details,
    dining_town_center_details: values.dining_town_center_details,
    parking_details: values.parking_details,
  };
}
