import { z } from "zod";

export const facetTagFamilySchema = z.enum([
  "item_tags",
  "search_tags",
  "atmosphere_tags",
  "occasion_tags",
  "meal_period_tags",
  "dietary_tags",
]);

export type FacetTagFamily = z.infer<typeof facetTagFamilySchema>;

export const facetTagSchema = z.object({
  family: facetTagFamilySchema,
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/),
});

export type FacetTag = z.infer<typeof facetTagSchema>;

export const discoveryEntityTypeSchema = z.enum(["storefront", "service"]);

export type DiscoveryEntityType = z.infer<typeof discoveryEntityTypeSchema>;

export const discoveryFilterStateSchema = z.object({
  entity_type: discoveryEntityTypeSchema,
  town_id: z.string().uuid().optional(),
  category_slug: z.string().min(1).optional(),
  service_category_slug: z.string().min(1).optional(),
  facet_tags: z.array(facetTagSchema).default([]),
  q: z.string().max(200).optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(48).default(24),
});

export type DiscoveryFilterState = z.infer<typeof discoveryFilterStateSchema>;

export const DEFAULT_PAGE_SIZE = 24;
