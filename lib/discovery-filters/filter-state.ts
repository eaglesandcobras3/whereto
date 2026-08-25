import { z } from "zod";

export const searchTagSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/);

export const discoveryEntityTypeSchema = z.enum(["storefront", "service"]);

export type DiscoveryEntityType = z.infer<typeof discoveryEntityTypeSchema>;

export const discoverBboxSchema = z.object({
  south: z.number().min(-90).max(90),
  west: z.number().min(-180).max(180),
  north: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
});

export const discoveryFilterStateSchema = z.object({
  entity_type: discoveryEntityTypeSchema,
  town_ids: z.array(z.string().uuid()).default([]),
  /** Named town(s) from a near search — ranked above other towns in the expanded zone. */
  anchor_town_ids: z.array(z.string().uuid()).default([]),
  category_slug: z.string().min(1).optional(),
  service_category_slug: z.string().min(1).optional(),
  /** Selected tags — hard filter (match at least one) when present. */
  tags: z.array(searchTagSlugSchema).default([]),
  q: z.string().max(200).optional(),
  /** Map viewport bounds — storefront only. */
  bbox: discoverBboxSchema.optional(),
  /** Map zoom for restoring the viewport (storefront map mode). */
  zoom: z.number().int().min(8).max(20).optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(48).default(12),
});

export type DiscoveryFilterState = z.infer<typeof discoveryFilterStateSchema>;

export const DEFAULT_PAGE_SIZE = 12;
export const DISCOVER_MAP_PAGE_SIZE = 48;
