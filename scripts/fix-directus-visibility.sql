-- Run these queries in Supabase SQL Editor to diagnose and fix visibility issues
-- for items added through Directus that aren't appearing in search

-- ========================================
-- STEP 1: DIAGNOSE - Check current state
-- ========================================

-- Check towns: show all and their visibility status
SELECT id, title, slug,
       is_hidden_from_search,
       archived_at,
       CASE
         WHEN archived_at IS NOT NULL THEN 'HIDDEN: archived'
         WHEN is_hidden_from_search = true THEN 'HIDDEN: is_hidden_from_search=true'
         ELSE 'VISIBLE'
       END as visibility_status
FROM towns
ORDER BY date_created DESC
LIMIT 20;

-- Check areas
SELECT id, title, slug,
       is_hidden_from_search,
       archived_at,
       CASE
         WHEN archived_at IS NOT NULL THEN 'HIDDEN: archived'
         WHEN is_hidden_from_search = true THEN 'HIDDEN: is_hidden_from_search=true'
         ELSE 'VISIBLE'
       END as visibility_status
FROM areas
ORDER BY date_created DESC
LIMIT 20;

-- Check businesses
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
-- STEP 2: FIX - Make all non-archived items visible
-- ========================================

-- Fix towns: clear is_hidden_from_search for all non-archived items
UPDATE towns
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL
  AND is_hidden_from_search = true;

-- Fix areas: clear is_hidden_from_search for all non-archived items
UPDATE areas
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL
  AND is_hidden_from_search = true;

-- Fix businesses: clear is_hidden_from_search for all non-archived items
UPDATE businesses
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL
  AND is_hidden_from_search = true;

-- ========================================
-- STEP 3: VERIFY - Confirm items are now visible
-- ========================================

-- Count visible vs hidden items
SELECT 'towns' as table_name,
       COUNT(*) FILTER (WHERE archived_at IS NULL AND (is_hidden_from_search IS NULL OR is_hidden_from_search = false)) as visible,
       COUNT(*) FILTER (WHERE archived_at IS NOT NULL OR is_hidden_from_search = true) as hidden
FROM towns
UNION ALL
SELECT 'areas',
       COUNT(*) FILTER (WHERE archived_at IS NULL AND (is_hidden_from_search IS NULL OR is_hidden_from_search = false)),
       COUNT(*) FILTER (WHERE archived_at IS NOT NULL OR is_hidden_from_search = true)
FROM areas
UNION ALL
SELECT 'businesses',
       COUNT(*) FILTER (WHERE archived_at IS NULL AND (is_hidden_from_search IS NULL OR is_hidden_from_search = false)),
       COUNT(*) FILTER (WHERE archived_at IS NOT NULL OR is_hidden_from_search = true)
FROM businesses;
