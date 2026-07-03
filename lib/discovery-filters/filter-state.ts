import { z } from "zod";

export const searchTagSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/);

export const discoveryEntityTypeSchema = z.enum(["storefront", "service"]);

export type DiscoveryEntityType = z.infer<typeof discoveryEntityTypeSchema>;

export const discoveryFilterStateSchema = z.object({
  entity_type: discoveryEntityTypeSchema,
  town_id: z.string().uuid().optional(),
  category_slug: z.string().min(1).optional(),
  service_category_slug: z.string().min(1).optional(),
  /** Selected `search_tags` slugs (AND — all must match, same as Search V2 `p_required_tags`). */
  tags: z.array(searchTagSlugSchema).default([]),
  q: z.string().max(200).optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(48).default(24),
});

export type DiscoveryFilterState = z.infer<typeof discoveryFilterStateSchema>;

export const DEFAULT_PAGE_SIZE = 24;
