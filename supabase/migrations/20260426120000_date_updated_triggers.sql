-- Auto-maintain `date_updated` on content tables so sitemaps, caches, and clients see a
-- fresh timestamp whenever a row is updated — independent of whether Directus or a sync
-- sends a value. Inserts are unchanged; app/Directus can still set `date_created` / initial `date_updated`.

CREATE OR REPLACE FUNCTION public.set_date_updated_to_now()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.date_updated = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_touch_date_updated ON public.businesses;
CREATE TRIGGER businesses_touch_date_updated
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS towns_touch_date_updated ON public.towns;
CREATE TRIGGER towns_touch_date_updated
BEFORE UPDATE ON public.towns
FOR EACH ROW
EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS guides_touch_date_updated ON public.guides;
CREATE TRIGGER guides_touch_date_updated
BEFORE UPDATE ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS events_touch_date_updated ON public.events;
CREATE TRIGGER events_touch_date_updated
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS areas_touch_date_updated ON public.areas;
CREATE TRIGGER areas_touch_date_updated
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS points_of_interest_touch_date_updated ON public.points_of_interest;
CREATE TRIGGER points_of_interest_touch_date_updated
BEFORE UPDATE ON public.points_of_interest
FOR EACH ROW
EXECUTE FUNCTION public.set_date_updated_to_now();

COMMENT ON FUNCTION public.set_date_updated_to_now() IS
  'Sets date_updated=now() on each UPDATE; use for sitemap lastModified and cache busting.';
