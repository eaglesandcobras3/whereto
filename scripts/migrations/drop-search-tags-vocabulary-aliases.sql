-- Drop unused metadata columns from search_tags_vocabulary.
-- Canonical tags on businesses were already normalized; runtime only reads `tag`.
-- Synonym rules for re-importing messy audit CSVs remain in scripts/lib/tag-vocabulary.ts.
-- Discover labels are derived from the tag slug (formatSearchTagLabel), not description.

alter table public.search_tags_vocabulary
  drop column if exists aliases;

alter table public.search_tags_vocabulary
  drop column if exists parent_class;
