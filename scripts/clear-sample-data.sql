-- Clear existing sample data before populating from markdown
-- Run this in Supabase SQL Editor

-- Delete businesses first (they reference towns)
DELETE FROM public.businesses;

-- Delete towns
DELETE FROM public.towns;

-- Verify it's empty
SELECT 'towns' as table_name, COUNT(*) as count FROM public.towns
UNION ALL
SELECT 'businesses', COUNT(*) FROM public.businesses;
