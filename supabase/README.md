# Supabase — WhereTo30A (`whereto30a`)

## Prerequisites (your account)

1. Create a project at [supabase.com](https://supabase.com).
2. Enable extensions **cube** and **earthdistance** (SQL: already in migration via `CREATE EXTENSION`).
3. Run migrations in `migrations/` in timestamp order: `20260402120000_init.sql`, `20260403140000_insert_discovery_business_with_tags.sql` (legacy RPC; later migrations replace it), `20260404120000_seo_town_architecture.sql` (regions, SEO pages, `businesses.slug`, extended `query_cache`), `20260407120000_topic_mining_privacy.sql` (privacy-safe topic mining tables), `20260408120000_phase3_collections_claims_cache.sql` (collections, claims, share referrer), `20260409120000_discovery_google_photos_rpc.sql` (historical RPC filename), `20260410130000_business_hero_image_storage.sql` (Storage bucket `business-images`, `hero_image_url`), `20260410140000_business_places_refresh_request.sql` (admin refresh queue column), **`20260411120000_geoapify_directory_sources.sql`** (`business_sources`, `business_images`, `categories.geoapify_categories`, RPC `insert_directory_listing_with_tags`), **`20260411210000_neutral_directory_column_names.sql`** (renames `google_*` / `places_refresh_*` columns to neutral names) — SQL Editor or Supabase CLI below.
4. Run `seed.sql` once to load towns, categories, tags, sample businesses, and discovery jobs.
5. **First admin:** after you sign up, run in SQL Editor:
   ```sql
   UPDATE public.profiles SET is_admin = TRUE WHERE id = '<your-auth-user-uuid>';
   ```

## Auth trigger

The migration creates `on_auth_user_created` on `auth.users`. If your project disallows that from the SQL editor, add the same trigger via Supabase Dashboard → Database → Triggers, or use the “Auth hook” pattern from Supabase docs.

## CLI (optional)

```bash
npx supabase link --project-ref <ref>
npx supabase db push
psql $DATABASE_URL -f supabase/seed.sql
```

## PostGIS note

Spatial indexing uses `ll_to_earth` from the **earthdistance** extension (with **cube**), matching the implementation plan. No separate PostGIS package is required for this schema.
