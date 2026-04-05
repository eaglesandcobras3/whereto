/** Abstract source labels only — no platform or thread identifiers. */

export const MINING_SOURCE_TYPES = [
  "manual_local_html_input",
  "local_community_discussion",
  "regional_trend_input",
  "operator_curated_sample",
] as const;

export type MiningSourceType = (typeof MINING_SOURCE_TYPES)[number];

export function parseSourceType(raw: string): MiningSourceType {
  const s = raw.trim();
  if (MINING_SOURCE_TYPES.includes(s as MiningSourceType)) {
    return s as MiningSourceType;
  }
  return "manual_local_html_input";
}
