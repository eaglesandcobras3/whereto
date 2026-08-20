/**
 * Seed town_relationships after scripts/migrations/town-relationships.sql.
 * Idempotent: re-run upserts by town_id (resolved via slug).
 *
 * Miles are approximate town-center-to-town-center display distances, rounded to 0.1 mi.
 * Santa Rosa Beach is on_corridor = false (section hidden in the app).
 */

INSERT INTO public.town_relationships (
  town_id,
  on_corridor,
  west_1_town_id,
  west_1_miles,
  west_2_town_id,
  west_2_miles,
  east_1_town_id,
  east_1_miles,
  east_2_town_id,
  east_2_miles,
  notes,
  source_url
)
SELECT
  t.id,
  s.on_corridor,
  w1.id,
  s.west_1_miles,
  w2.id,
  s.west_2_miles,
  e1.id,
  s.east_1_miles,
  e2.id,
  s.east_2_miles,
  s.notes,
  s.source_url
FROM (
  VALUES
    (
      'sandestin'::text,
      true,
      NULL::text,
      NULL::numeric,
      NULL::text,
      NULL::numeric,
      'dune-allen-beach'::text,
      3.2::numeric,
      'gulf-place'::text,
      4.8::numeric,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.'::text,
      'https://www.sandestin.com/about/getting-here'::text
    ),
    (
      'dune-allen-beach',
      true,
      'sandestin',
      3.2,
      NULL,
      NULL,
      'gulf-place',
      1.6,
      'blue-mountain-beach',
      3.6,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.visitsouthwalton.com/neighborhoods/dune-allen/'
    ),
    (
      'gulf-place',
      true,
      'dune-allen-beach',
      1.6,
      'sandestin',
      4.8,
      'blue-mountain-beach',
      2.0,
      'grayton-beach',
      4.3,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.visitsouthwalton.com/listing/gulf-place-community-management-associates-inc/'
    ),
    (
      'blue-mountain-beach',
      true,
      'gulf-place',
      2.0,
      'dune-allen-beach',
      3.6,
      'grayton-beach',
      2.3,
      'watercolor',
      4.6,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.visitsouthwalton.com/neighborhoods/blue-mountain/'
    ),
    (
      'grayton-beach',
      true,
      'blue-mountain-beach',
      2.3,
      'gulf-place',
      4.3,
      'watercolor',
      2.3,
      'seaside',
      2.8,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.visitsouthwalton.com/neighborhoods/grayton-beach/'
    ),
    (
      'watercolor',
      true,
      'grayton-beach',
      2.3,
      'blue-mountain-beach',
      4.6,
      'seaside',
      0.5,
      'seagrove-beach',
      1.2,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.southernliving.com/watercolor-fl-8785182'
    ),
    (
      'seaside',
      true,
      'watercolor',
      0.5,
      'grayton-beach',
      2.8,
      'seagrove-beach',
      0.7,
      'watersound',
      3.7,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://seasidefl.com/getting-here/'
    ),
    (
      'seagrove-beach',
      true,
      'seaside',
      0.7,
      'watercolor',
      1.2,
      'watersound',
      3.0,
      'alys-beach',
      6.3,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.visitsouthwalton.com/neighborhoods/seagrove/'
    ),
    (
      'watersound',
      true,
      'seagrove-beach',
      3.0,
      'seaside',
      3.7,
      'alys-beach',
      3.3,
      'seacrest-beach',
      3.9,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.visitsouthwalton.com/neighborhoods/watersound/'
    ),
    (
      'alys-beach',
      true,
      'watersound',
      3.3,
      'seagrove-beach',
      6.3,
      'seacrest-beach',
      0.6,
      'rosemary-beach',
      1.1,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://alysbeach.com/location/'
    ),
    (
      'seacrest-beach',
      true,
      'alys-beach',
      0.6,
      'watersound',
      3.9,
      'rosemary-beach',
      0.5,
      'inlet-beach',
      2.0,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://peddlers30a.com/'
    ),
    (
      'rosemary-beach',
      true,
      'seacrest-beach',
      0.5,
      'alys-beach',
      1.1,
      'inlet-beach',
      1.5,
      'carillon-beach',
      3.5,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://rosemarybeach.com/directions-map-2/'
    ),
    (
      'inlet-beach',
      true,
      'rosemary-beach',
      1.5,
      'seacrest-beach',
      2.0,
      'carillon-beach',
      2.0,
      NULL,
      NULL,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://www.visitsouthwalton.com/neighborhoods/inlet-beach/'
    ),
    (
      'carillon-beach',
      true,
      'inlet-beach',
      2.0,
      'rosemary-beach',
      3.5,
      NULL,
      NULL,
      NULL,
      NULL,
      'Approx. town-center-to-town-center display mileage; rounded to 0.1 mi.',
      'https://carillon-beach.com/about/directions/'
    ),
    (
      'santa-rosa-beach',
      false,
      'dune-allen-beach',
      4.6,
      'sandestin',
      6.7,
      'gulf-place',
      3.0,
      'blue-mountain-beach',
      5.3,
      'SPECIAL: Santa Rosa Beach is a broad geographic area rather than one compact stop on the 30A line. Use these as approximate nearby-town relationships, or handle this page with custom logic.',
      'https://www.visitsouthwalton.com/neighborhoods/santa-rosa-beach/'
    )
) AS s (
  slug,
  on_corridor,
  west_1_slug,
  west_1_miles,
  west_2_slug,
  west_2_miles,
  east_1_slug,
  east_1_miles,
  east_2_slug,
  east_2_miles,
  notes,
  source_url
)
INNER JOIN public.towns t ON t.slug = s.slug
LEFT JOIN public.towns w1 ON w1.slug = s.west_1_slug
LEFT JOIN public.towns w2 ON w2.slug = s.west_2_slug
LEFT JOIN public.towns e1 ON e1.slug = s.east_1_slug
LEFT JOIN public.towns e2 ON e2.slug = s.east_2_slug
ON CONFLICT (town_id) DO UPDATE SET
  on_corridor = EXCLUDED.on_corridor,
  west_1_town_id = EXCLUDED.west_1_town_id,
  west_1_miles = EXCLUDED.west_1_miles,
  west_2_town_id = EXCLUDED.west_2_town_id,
  west_2_miles = EXCLUDED.west_2_miles,
  east_1_town_id = EXCLUDED.east_1_town_id,
  east_1_miles = EXCLUDED.east_1_miles,
  east_2_town_id = EXCLUDED.east_2_town_id,
  east_2_miles = EXCLUDED.east_2_miles,
  notes = EXCLUDED.notes,
  source_url = EXCLUDED.source_url;
