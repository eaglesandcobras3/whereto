/**
 * Single region for now: one `regions` row (slug `30a`) and one public hub at `/towns`.
 * We do not serve extra region pages at `/{slug}`; only beach towns use the root segment.
 */
export const PRIMARY_REGION_DB_SLUG = "30a" as const;

export const PRIMARY_REGION_HUB_PATH = "/towns" as const;
