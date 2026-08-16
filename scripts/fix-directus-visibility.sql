-- Diagnose / clear is_hidden_from_search leftovers.
--
-- App policy (2026-08): towns, areas, and guides ignore this flag — published + not
-- archived means public and SEO-ready. Businesses still respect soft-hide.
-- Clearing the flag here keeps CMS/Directus rows tidy and avoids confusion in SQL.

-- ========================================
-- STEP 1: DIAGNOSE - Check current state
-- ========================================

SELECT id, title, slug, status,
       is_hidden_from_search,
       archived_at,
       CASE
         WHEN archived_at IS NOT NULL THEN 'ARCHIVED'
         WHEN status IS DISTINCT FROM 'published' THEN 'NOT_PUBLISHED'
         WHEN is_hidden_from_search = true THEN 'FLAG_SET (app ignores for towns)'
         ELSE 'PUBLISHED'
       END as visibility_status
FROM towns
ORDER BY date_created DESC
LIMIT 20;

SELECT id, title, slug, status,
       is_hidden_from_search,
       archived_at,
       CASE
         WHEN archived_at IS NOT NULL THEN 'ARCHIVED'
         WHEN status IS DISTINCT FROM 'published' THEN 'NOT_PUBLISHED'
         WHEN is_hidden_from_search = true THEN 'FLAG_SET (app ignores for areas)'
         ELSE 'PUBLISHED'
       END as visibility_status
FROM areas
ORDER BY date_created DESC
LIMIT 20;

SELECT id, title, slug, status,
       is_hidden_from_search,
       archived_at,
       CASE
         WHEN archived_at IS NOT NULL THEN 'ARCHIVED'
         WHEN status IS DISTINCT FROM 'published' THEN 'NOT_PUBLISHED'
         WHEN is_hidden_from_search = true THEN 'FLAG_SET (app ignores for guides)'
         ELSE 'PUBLISHED'
       END as visibility_status
FROM guides
ORDER BY date_created DESC
LIMIT 20;

-- Businesses still use the soft-hide flag in the app.
SELECT id, title, slug,
       is_hidden_from_search,
       archived_at,
       CASE
         WHEN archived_at IS NOT NULL THEN 'HIDDEN: archived'
         WHEN is_hidden_from_search = true THEN 'HIDDEN: is_hidden_from_search=true'
         ELSE 'VISIBLE'
       END as visibility_status
FROM businesses
ORDER BY date_created DESC
LIMIT 20;

-- ========================================
-- STEP 2: FIX - Clear hide flag on editorial entities + optional businesses
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

-- Optional: clear hide on businesses (only if you intend every non-archived listing
-- to be discoverable). Comment out if you rely on soft-hide for thin/duplicate listings.
-- UPDATE businesses
-- SET is_hidden_from_search = false
-- WHERE archived_at IS NULL
--   AND is_hidden_from_search = true;

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
       COUNT(*) FILTER (WHERE archived_at IS NULL AND (is_hidden_from_search IS NULL OR is_hidden_from_search = false)),
       COUNT(*) FILTER (WHERE archived_at IS NULL AND is_hidden_from_search = true)
FROM businesses;
