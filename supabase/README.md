# Supabase — 30A platform

## Prerequisites (your account)

1. Create a project at [supabase.com](https://supabase.com).
2. Enable extensions **cube** and **earthdistance** (SQL: already in migration via `CREATE EXTENSION`).
3. Run migrations in `migrations/` in timestamp order (initial schema `20260402120000_init.sql`, then `20260403140000_insert_discovery_business_with_tags.sql` for atomic discovery inserts) — SQL Editor or Supabase CLI below.
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
