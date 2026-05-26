-- Town adjacency: defines which towns are geographically neighboring on the 30A corridor.
-- Used to expand "near <town>" searches to include adjacent towns.
--
-- Order east → west:
-- Carillon Beach → Inlet Beach → Rosemary Beach → Seacrest Beach → Alys Beach →
-- Watersound → Seagrove Beach → Seaside → Watercolor → Grayton Beach →
-- Blue Mountain Beach → Santa Rosa Beach → Gulf Place → Dune Allen Beach → Sandestin

CREATE TABLE IF NOT EXISTS public.town_adjacency (
  town_id_a uuid NOT NULL REFERENCES public.towns(id) ON DELETE CASCADE,
  town_id_b uuid NOT NULL REFERENCES public.towns(id) ON DELETE CASCADE,
  PRIMARY KEY (town_id_a, town_id_b),
  CONSTRAINT town_adjacency_no_self CHECK (town_id_a <> town_id_b),
  CONSTRAINT town_adjacency_ordered CHECK (town_id_a < town_id_b)
);

-- IDs reference the towns table (UUIDs):
--   Alys Beach        dc7c2d12-7d5f-42a9-8647-22b36c3c9b18
--   Blue Mtn Beach    9a5e189e-c2cd-40fd-b42d-2f3cbb21817f
--   Carillon Beach    a14f5632-a269-46ac-959d-ec5d8bf3cc71
--   Dune Allen Beach  949d5983-15a3-46ef-a816-9ea9944b1fca
--   Grayton Beach     c28229c6-1e22-494e-bc1a-b1e6346277bf
--   Gulf Place        bb1a6bc4-a622-4f41-b87e-78f9ca5fcb49
--   Inlet Beach       e3dbe862-050f-4311-8b98-13a917de59c8
--   Rosemary Beach    36cb4929-189a-4128-91b0-084b863d7d0b
--   Sandestin         82fe6f61-980a-4df3-a8a1-8fc07c32240a
--   Santa Rosa Beach  9ef2a8e9-4343-4b73-a14c-f7a86bdc1b36
--   Seacrest Beach    9054ed32-e80e-4b56-abfb-8529db765086
--   Seagrove Beach    4fdb8e35-30d1-4ef2-b859-abb9603ba58b
--   Seaside           3fa31f69-36d0-4beb-a6b1-c8bcb21ac72b
--   Watercolor        770bacbe-50a3-4457-9ebd-3ecb997eed8b
--   Watersound        40400d3a-ef4f-4901-9169-b37d0cc76f59

INSERT INTO public.town_adjacency (town_id_a, town_id_b) VALUES
  -- Carillon Beach ↔ Inlet Beach
  (least('a14f5632-a269-46ac-959d-ec5d8bf3cc71'::uuid, 'e3dbe862-050f-4311-8b98-13a917de59c8'::uuid),
   greatest('a14f5632-a269-46ac-959d-ec5d8bf3cc71'::uuid, 'e3dbe862-050f-4311-8b98-13a917de59c8'::uuid)),
  -- Inlet Beach ↔ Rosemary Beach
  (least('e3dbe862-050f-4311-8b98-13a917de59c8'::uuid, '36cb4929-189a-4128-91b0-084b863d7d0b'::uuid),
   greatest('e3dbe862-050f-4311-8b98-13a917de59c8'::uuid, '36cb4929-189a-4128-91b0-084b863d7d0b'::uuid)),
  -- Rosemary Beach ↔ Seacrest Beach
  (least('36cb4929-189a-4128-91b0-084b863d7d0b'::uuid, '9054ed32-e80e-4b56-abfb-8529db765086'::uuid),
   greatest('36cb4929-189a-4128-91b0-084b863d7d0b'::uuid, '9054ed32-e80e-4b56-abfb-8529db765086'::uuid)),
  -- Seacrest Beach ↔ Alys Beach
  (least('9054ed32-e80e-4b56-abfb-8529db765086'::uuid, 'dc7c2d12-7d5f-42a9-8647-22b36c3c9b18'::uuid),
   greatest('9054ed32-e80e-4b56-abfb-8529db765086'::uuid, 'dc7c2d12-7d5f-42a9-8647-22b36c3c9b18'::uuid)),
  -- Alys Beach ↔ Watersound
  (least('dc7c2d12-7d5f-42a9-8647-22b36c3c9b18'::uuid, '40400d3a-ef4f-4901-9169-b37d0cc76f59'::uuid),
   greatest('dc7c2d12-7d5f-42a9-8647-22b36c3c9b18'::uuid, '40400d3a-ef4f-4901-9169-b37d0cc76f59'::uuid)),
  -- Watersound ↔ Seagrove Beach
  (least('40400d3a-ef4f-4901-9169-b37d0cc76f59'::uuid, '4fdb8e35-30d1-4ef2-b859-abb9603ba58b'::uuid),
   greatest('40400d3a-ef4f-4901-9169-b37d0cc76f59'::uuid, '4fdb8e35-30d1-4ef2-b859-abb9603ba58b'::uuid)),
  -- Seagrove Beach ↔ Seaside
  (least('4fdb8e35-30d1-4ef2-b859-abb9603ba58b'::uuid, '3fa31f69-36d0-4beb-a6b1-c8bcb21ac72b'::uuid),
   greatest('4fdb8e35-30d1-4ef2-b859-abb9603ba58b'::uuid, '3fa31f69-36d0-4beb-a6b1-c8bcb21ac72b'::uuid)),
  -- Seaside ↔ Watercolor
  (least('3fa31f69-36d0-4beb-a6b1-c8bcb21ac72b'::uuid, '770bacbe-50a3-4457-9ebd-3ecb997eed8b'::uuid),
   greatest('3fa31f69-36d0-4beb-a6b1-c8bcb21ac72b'::uuid, '770bacbe-50a3-4457-9ebd-3ecb997eed8b'::uuid)),
  -- Watercolor ↔ Grayton Beach
  (least('770bacbe-50a3-4457-9ebd-3ecb997eed8b'::uuid, 'c28229c6-1e22-494e-bc1a-b1e6346277bf'::uuid),
   greatest('770bacbe-50a3-4457-9ebd-3ecb997eed8b'::uuid, 'c28229c6-1e22-494e-bc1a-b1e6346277bf'::uuid)),
  -- Grayton Beach ↔ Blue Mountain Beach
  (least('c28229c6-1e22-494e-bc1a-b1e6346277bf'::uuid, '9a5e189e-c2cd-40fd-b42d-2f3cbb21817f'::uuid),
   greatest('c28229c6-1e22-494e-bc1a-b1e6346277bf'::uuid, '9a5e189e-c2cd-40fd-b42d-2f3cbb21817f'::uuid)),
  -- Blue Mountain Beach ↔ Santa Rosa Beach
  (least('9a5e189e-c2cd-40fd-b42d-2f3cbb21817f'::uuid, '9ef2a8e9-4343-4b73-a14c-f7a86bdc1b36'::uuid),
   greatest('9a5e189e-c2cd-40fd-b42d-2f3cbb21817f'::uuid, '9ef2a8e9-4343-4b73-a14c-f7a86bdc1b36'::uuid)),
  -- Santa Rosa Beach ↔ Gulf Place
  (least('9ef2a8e9-4343-4b73-a14c-f7a86bdc1b36'::uuid, 'bb1a6bc4-a622-4f41-b87e-78f9ca5fcb49'::uuid),
   greatest('9ef2a8e9-4343-4b73-a14c-f7a86bdc1b36'::uuid, 'bb1a6bc4-a622-4f41-b87e-78f9ca5fcb49'::uuid)),
  -- Gulf Place ↔ Dune Allen Beach
  (least('bb1a6bc4-a622-4f41-b87e-78f9ca5fcb49'::uuid, '949d5983-15a3-46ef-a816-9ea9944b1fca'::uuid),
   greatest('bb1a6bc4-a622-4f41-b87e-78f9ca5fcb49'::uuid, '949d5983-15a3-46ef-a816-9ea9944b1fca'::uuid)),
  -- Dune Allen Beach ↔ Sandestin
  (least('949d5983-15a3-46ef-a816-9ea9944b1fca'::uuid, '82fe6f61-980a-4df3-a8a1-8fc07c32240a'::uuid),
   greatest('949d5983-15a3-46ef-a816-9ea9944b1fca'::uuid, '82fe6f61-980a-4df3-a8a1-8fc07c32240a'::uuid))
ON CONFLICT DO NOTHING;

-- hybrid_search_businesses: vector similarity search with optional single or multi-town filter.
CREATE OR REPLACE FUNCTION public.hybrid_search_businesses(
  query_text       text,
  query_embedding  vector(1536),
  match_count      int       DEFAULT 24,
  p_town_id        text      DEFAULT NULL,
  p_category_id    text      DEFAULT NULL,
  p_town_ids       text[]    DEFAULT NULL,
  p_anchor_town_id text      DEFAULT NULL
)
RETURNS TABLE (
  id                    text,
  slug                  text,
  title                 text,
  excerpt               text,
  address               text,
  phone                 text,
  website               text,
  map_lat               float8,
  map_lng               float8,
  review_rating_cached  float8,
  review_count_cached   float8,
  main_image            text,
  hero_image            text,
  main_image_url        text,
  hero_image_url        text,
  status                text,
  featured              boolean,
  date_updated          timestamptz,
  town_id               text,
  primary_category_id   text,
  vec_similarity        real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id::text,
    b.slug,
    b.title,
    b.excerpt,
    b.address,
    b.phone,
    b.website,
    b.map_lat,
    b.map_lng,
    b.review_rating_cached,
    b.review_count_cached,
    b.main_image,
    b.hero_image,
    resolve_directus_file_url(b.main_image)  AS main_image_url,
    resolve_directus_file_url(b.hero_image)  AS hero_image_url,
    b.status,
    b.featured,
    b.date_updated,
    b.town_id::text,
    b.primary_category_id::text,
    (1 - (b.embedding <=> query_embedding))::real AS vec_similarity
  FROM public.businesses b
  WHERE
    b.archived_at IS NULL
    AND b.status = 'published'
    AND b.is_hidden_from_search IS NOT TRUE
    AND b.embedding IS NOT NULL
    AND (
      p_town_ids IS NOT NULL AND b.town_id::text = ANY(p_town_ids)
      OR p_town_id IS NOT NULL AND p_town_ids IS NULL AND b.town_id::text = p_town_id
      OR p_town_id IS NULL AND p_town_ids IS NULL
    )
    AND (p_category_id IS NULL OR b.primary_category_id::text = p_category_id)
  ORDER BY
    -- Anchor town gets a +0.1 similarity boost so Rosemary results beat nearby-town
    -- results unless the nearby result is significantly more relevant.
    (1 - (b.embedding <=> query_embedding)) +
      CASE WHEN p_anchor_town_id IS NOT NULL AND b.town_id::text = p_anchor_town_id
           THEN 0.1 ELSE 0 END DESC,
    COALESCE(b.review_rating_cached, 0) DESC,
    b.title
  LIMIT match_count;
$$;
