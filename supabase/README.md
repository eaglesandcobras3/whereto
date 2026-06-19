# Supabase migrations

Apply SQL files in `supabase/migrations/` in timestamp order against your Supabase project (SQL Editor or `supabase db push`).

## Business Portal

| Migration | Purpose |
|-----------|---------|
| `20260617120000_business_portal_phase1.sql` | `business_members`, `portal_review_items`, `business_listing_requests`, `business_claim_requests`, business claim columns |

After applying, verify tables exist and run portal smoke tests from [OPERATOR-TODO-business-portal.md](../docs/OPERATOR-TODO-business-portal.md).
