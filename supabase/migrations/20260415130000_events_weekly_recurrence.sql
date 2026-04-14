-- Weekly recurring events (e.g. farmers markets): one row per series.
-- recurrence_weekday: 0 = Sunday … 6 = Saturday (matches JavaScript Date.getDay()).
-- event_date: first calendar day the series can occur (season start).
-- end_date: last calendar day of the season (inclusive). If null for weekly rows,
--   listings cap the horizon at event_date + 730 days for next-occurrence search.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_frequency text
    CHECK (recurrence_frequency IS NULL OR recurrence_frequency = 'weekly');

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_weekday smallint
    CHECK (
      recurrence_weekday IS NULL
      OR (recurrence_weekday >= 0 AND recurrence_weekday <= 6)
    );

COMMENT ON COLUMN public.events.recurrence_frequency IS 'NULL = one-off or multi-day block; weekly = repeats on recurrence_weekday through season.';
COMMENT ON COLUMN public.events.recurrence_weekday IS '0=Sun … 6=Sat (JS getDay). Required when recurrence_frequency = weekly.';

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_recurrence_weekday_consistency;
ALTER TABLE public.events ADD CONSTRAINT events_recurrence_weekday_consistency CHECK (
  (recurrence_frequency IS NULL AND recurrence_weekday IS NULL)
  OR (recurrence_frequency = 'weekly' AND recurrence_weekday IS NOT NULL)
);

CREATE OR REPLACE VIEW public.upcoming_events AS
WITH base AS (
  SELECT
    e.*,
    t.name AS town_name,
    t.slug AS town_slug,
    CASE
      WHEN e.recurrence_frequency = 'weekly' AND e.recurrence_weekday IS NOT NULL THEN
        (
          SELECT (gs.d)::date
          FROM generate_series(
            (GREATEST(CURRENT_DATE, e.event_date))::timestamp,
            (COALESCE(e.end_date, e.event_date + 730))::timestamp,
            '1 day'::interval
          ) AS gs(d)
          WHERE EXTRACT(DOW FROM (gs.d)::date)::integer = e.recurrence_weekday::integer
          ORDER BY gs.d ASC
          LIMIT 1
        )
      ELSE NULL::date
    END AS weekly_next
  FROM public.events e
  LEFT JOIN public.towns t ON e.town_id = t.id
  WHERE e.status = 'active'
)
SELECT
  base.id,
  base.slug,
  base.title,
  base.description,
  base.hero_image_url,
  base.event_date,
  base.end_date,
  base.town_id,
  base.venue_name,
  base.address,
  base.lat,
  base.lng,
  base.price,
  base.website,
  base.tags,
  base.status,
  base.created_at,
  base.updated_at,
  base.recurrence_frequency,
  base.recurrence_weekday,
  base.town_name,
  base.town_slug,
  COALESCE(base.weekly_next, base.event_date) AS next_list_date
FROM base
WHERE
  (
    base.recurrence_frequency IS NULL
    AND (
      base.end_date >= CURRENT_DATE
      OR (base.end_date IS NULL AND base.event_date >= CURRENT_DATE)
    )
  )
  OR (base.recurrence_frequency = 'weekly' AND base.weekly_next IS NOT NULL);
