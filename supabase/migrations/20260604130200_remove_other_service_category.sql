-- Drop catch-all "other" specialty; vendors should map to a real trade.

UPDATE public.businesses
SET service_category_id = NULL
WHERE service_category_id IN (
  SELECT id FROM public.service_categories WHERE slug = 'other'
);

UPDATE public.service_categories
SET status = 'archived', archived_at = COALESCE(archived_at, now())
WHERE slug = 'other';
