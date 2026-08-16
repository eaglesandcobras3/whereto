-- Diagnose / clear is_hidden_from_search leftovers.
--
-- App policy (2026-08): published + not archived means public and SEO-ready for
-- towns, areas, guides, businesses, events, and POIs. Rentals use published +
-- active partner (+ index-readiness gates). Soft-hide is ignored by the app.
-- Clearing the flag keeps CMS/Directus rows tidy.

-- ========================================
-- STEP 1: DIAGNOSE
-- ========================================

SELECT 'towns' as entity, id::text, title, slug, status, is_hidden_from_search, archived_at
FROM towns ORDER BY date_created DESC NULLS LAST LIMIT 20;

SELECT 'areas' as entity, id::text, title, slug, status, is_hidden_from_search, archived_at
FROM areas ORDER BY date_created DESC NULLS LAST LIMIT 20;

SELECT 'guides' as entity, id::text, title, slug, status, is_hidden_from_search, archived_at
FROM guides ORDER BY date_created DESC NULLS LAST LIMIT 20;

SELECT 'businesses' as entity, id::text, title, slug, status, is_hidden_from_search, archived_at
FROM businesses ORDER BY date_created DESC NULLS LAST LIMIT 20;

-- ========================================
-- STEP 2: FIX — clear soft-hide on live rows
-- ========================================

UPDATE towns
SET is_hidden_from_search = false
WHERE archived_at IS NULL
  AND (is_hidden_from_search IS DISTINCT FROM false);

UPDATE areas
SET is_hidden_from_search = false
WHERE archived_at IS NULL
  AND (is_hidden_from_search IS DISTINCT FROM false);

UPDATE guides
SET is_hidden_from_search = false
WHERE archived_at IS NULL
  AND (is_hidden_from_search IS DISTINCT FROM false);

UPDATE businesses
SET is_hidden_from_search = false
WHERE archived_at IS NULL
  AND (is_hidden_from_search IS DISTINCT FROM false);

UPDATE rental_properties
SET is_hidden_from_search = false
WHERE (is_hidden_from_search IS DISTINCT FROM false);

-- ========================================
-- STEP 3: VERIFY
-- ========================================

SELECT 'towns' as table_name,
       COUNT(*) FILTER (WHERE archived_at IS NULL AND status = 'published') as published,
       COUNT(*) FILTER (WHERE archived_at IS NULL AND is_hidden_from_search = true) as flag_still_true
FROM towns
UNION ALL
SELECT 'areas',
       COUNT(*) FILTER (WHERE archived_at IS NULL AND status = 'published'),
       COUNT(*) FILTER (WHERE archived_at IS NULL AND is_hidden_from_search = true)
FROM areas
UNION ALL
SELECT 'guides',
       COUNT(*) FILTER (WHERE archived_at IS NULL AND status = 'published'),
       COUNT(*) FILTER (WHERE archived_at IS NULL AND is_hidden_from_search = true)
FROM guides
UNION ALL
SELECT 'businesses',
       COUNT(*) FILTER (WHERE archived_at IS NULL AND status = 'published'),
       COUNT(*) FILTER (WHERE archived_at IS NULL AND is_hidden_from_search = true)
FROM businesses
UNION ALL
SELECT 'rental_properties',
       COUNT(*) FILTER (WHERE status = 'published'),
       COUNT(*) FILTER (WHERE is_hidden_from_search = true)
FROM rental_properties;
