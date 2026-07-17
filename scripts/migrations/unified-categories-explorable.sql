-- Unified categories + town/area explorable flag.
-- Run in Supabase SQL editor (or linked CLI) before scripts/migrate-unified-categories.ts.
--
-- Strategy: keep `business_categories` as the single taxonomy table.
--   - Rollups: parent_category_id IS NULL
--   - Leaves: parent_category_id → rollup
-- `service_categories` remains readable until the migration script remaps
-- businesses.service_category_id → businesses.primary_category_id, then clears it.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_explorable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.is_explorable IS
  'When true with is_storefront, listing appears on town and area browse grids. Free intake defaults false; admin can enable on approve.';

-- Existing storefronts stay on town/area pages until operators tighten the flag.
UPDATE public.businesses
SET is_explorable = true
WHERE is_storefront IS TRUE
  AND is_explorable IS FALSE;

COMMENT ON COLUMN public.businesses.service_category_id IS
  'DEPRECATED: prefer primary_category_id against unified business_categories. Cleared by migrate-unified-categories.ts.';

-- After adding is_explorable, recreate businesses_view so town/area queries can filter it:
--   scripts/migrations/businesses-view-search-tags.sql
