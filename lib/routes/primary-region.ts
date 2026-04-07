/**
 * Default region hub: DB row uses slug `30a`; public URL is `/towns` so we do not
 * repeat “30A” on whereto30a.com. Other regions (e.g. future PCB) keep `/{regionSlug}`.
 */
export const PRIMARY_REGION_DB_SLUG = "30a" as const;

export const PRIMARY_REGION_HUB_PATH = "/towns" as const;
