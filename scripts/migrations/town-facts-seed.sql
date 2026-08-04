/**
 * Seed town “at a glance” facts after scripts/migrations/town-facts.sql.
 * Idempotent: re-run updates the same columns by slug.
 * Production Directus rows use `title`; local seed rows may use `name` — match on slug either way.
 */

UPDATE public.towns SET
  at_a_glance_description = 'A walkable town center with cobblestone streets, boutique shopping, and dinner on foot — polished without feeling far from the Gulf.',
  walkability_rating = 'Excellent',
  walkability_subtext = 'Everything is close by',
  beach_type = 'Private',
  beach_type_subtext = 'Resident & guest access',
  dining_rating = 'Extensive',
  dining_subtext = 'Many options nearby',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'No golf carts allowed',
  highlights = ARRAY[
    'Boutique Shopping',
    'Fine Dining',
    'Coffee Shops',
    'Architecture',
    'Town Squares',
    'Walkable',
    'Bike Friendly',
    'Events'
  ],
  beach_access_details = 'Beach access is a few blocks from the town center and limited to residents and overnight guests. Day visitors should use public accesses in nearby towns.',
  getting_around_details = 'Rosemary is built for walking and biking. Golf carts are not allowed, which keeps the center quieter and more pedestrian-friendly.',
  dining_town_center_details = 'The town center packs boutiques, coffee, and restaurants into a compact loop — easy to do dinner and a stroll without getting in the car.',
  parking_details = 'Town-center parking gets tight on busy weekends. If you are staying in the core, walking or biking beats circling for a spot.'
WHERE slug = 'rosemary-beach';

UPDATE public.towns SET
  at_a_glance_description = 'White walls, calm courtyards, and a polished pace that feels intentionally quiet.',
  walkability_rating = 'High',
  walkability_subtext = 'Easy inside the community',
  beach_type = 'Private',
  beach_type_subtext = 'Guest & resident access',
  dining_rating = 'Select',
  dining_subtext = 'Reservations help in season',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'Car rarely needed for dinner',
  highlights = ARRAY['Architecture', 'Walkable', 'Fine Dining', 'Bike Friendly'],
  beach_access_details = 'Pedestrian-friendly layout with controlled access points. Most guests walk or bike to the beach from inside the community.',
  getting_around_details = 'Inside Alys, walking and biking cover dinner and beach runs. You will still drive for groceries or exploring other towns.',
  dining_town_center_details = 'Polished restaurants where reservations matter in summer — more event-like dinners than grab-and-go beach food.',
  parking_details = 'Limited town-center parking in peak season. Staying inside Alys means you rarely need the car for dinner.'
WHERE slug = 'alys-beach';

UPDATE public.towns SET
  at_a_glance_description = 'Pastel cottages, a walkable town green, and the 30A town everyone pictures first.',
  walkability_rating = 'Excellent',
  walkability_subtext = 'Coffee to beach on foot',
  beach_type = 'Public',
  beach_type_subtext = 'Short walk from most rentals',
  dining_rating = 'Extensive',
  dining_subtext = 'Green + Gulf-front options',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'Car for groceries & day trips',
  highlights = ARRAY['Town Squares', 'Walkable', 'Family Friendly', 'Bike Friendly', 'Events', 'Coffee Shops'],
  beach_access_details = 'Most rentals put you a short walk from the sand. Public access points branch off the main streets.',
  getting_around_details = 'For a typical week, coffee, beach, and dinner are walkable. You will still want a car for Publix or a day farther along 30A.',
  dining_town_center_details = 'Pizza and tacos on the green, Gulf-front sunset tables, and nicer spots when you want a real sit-down night.',
  parking_details = 'Summer Saturdays fill up fast. Get to the beach before 10 or walk from the house. Biking beats circling the lots.'
WHERE slug = 'seaside';

UPDATE public.towns SET
  at_a_glance_description = 'Quieter eastern 30A with wide beaches and a more residential feel than Rosemary next door.',
  walkability_rating = 'Moderate',
  walkability_subtext = '30Avenue cluster nearby',
  beach_type = 'Public',
  beach_type_subtext = 'Wide eastern stretch',
  dining_rating = 'Growing',
  dining_subtext = '30Avenue + short drives',
  getting_around_summary = 'Walk • Bike • Drive',
  getting_around_subtext = 'Quieter than mid-corridor',
  highlights = ARRAY['Wide Beaches', 'Residential', 'Bike Friendly', 'Quiet'],
  beach_access_details = 'Wide beaches and fewer towers than mid-corridor towns. Most rentals put you a short walk or bike ride from access points.',
  getting_around_details = 'Residential pace with bike-friendly stretches. Drive into Rosemary when you want a bigger night out.',
  dining_town_center_details = 'Coffee and casual meals around 30Avenue. Rosemary and Alys are a quick drive for a wider dinner mix.',
  parking_details = 'Holiday weekends still fill up, but most weeks you avoid the Seaside-level parking shuffle. Arrive early on peak Saturdays if you are driving to the sand.'
WHERE slug = 'inlet-beach';

UPDATE public.towns SET
  at_a_glance_description = 'Residential stretch between Rosemary and Alys with lagoon pools and a calmer soundtrack.',
  walkability_rating = 'Varies',
  walkability_subtext = 'Depends on your rental pin',
  beach_type = 'Mixed',
  beach_type_subtext = 'Walk or short drive',
  dining_rating = 'Nearby',
  dining_subtext = 'Drive to Rosemary / Alys',
  getting_around_summary = 'Walk • Bike • Drive',
  getting_around_subtext = 'Paths between towns',
  highlights = ARRAY['Family Friendly', 'Pools', 'Quiet', 'Bike Friendly'],
  beach_access_details = 'Depends where you land. Some rentals walk to Rosemary or the beach; others are a short drive. Check the pin before you book.',
  getting_around_details = 'Residential streets with paths linking toward Rosemary and Alys. Peak weeks add bike and foot traffic between towns.',
  dining_town_center_details = 'Mostly residential — plan to walk or drive east to Rosemary and Alys for restaurants, or west toward Seagrove.',
  parking_details = 'Residential streets are easier than town centers. Peak weeks still add bikes and foot traffic on the shared paths.'
WHERE slug = 'seacrest-beach';

UPDATE public.towns SET
  at_a_glance_description = 'Tree-lined streets and a tucked-away feel between the busier town centers.',
  walkability_rating = 'Low',
  walkability_subtext = 'Residential base',
  beach_type = 'Public',
  beach_type_subtext = 'Short drive or bike',
  dining_rating = 'Drive',
  dining_subtext = 'Plan dinners in Seagrove',
  getting_around_summary = 'Bike • Drive',
  getting_around_subtext = 'Car for most errands',
  highlights = ARRAY['Quiet', 'Residential', 'Privacy', 'Bike Friendly'],
  beach_access_details = 'No dense town center here. Beach access is a short bike ride or drive depending on where you are staying.',
  getting_around_details = 'Neighborhood feel — most guests bike or drive to restaurants and beach access.',
  dining_town_center_details = 'Plan dinners in Seagrove, Seaside, or Rosemary. The tradeoff is peace at home versus walk-out-the-door restaurants.',
  parking_details = 'Neighborhood parking is straightforward. You will use the car more for dining and errands than in Seaside or Rosemary.'
WHERE slug = 'watersound';

UPDATE public.towns SET
  at_a_glance_description = 'Central 30A with a restaurant strip and older beach cottages mixed with newer builds.',
  walkability_rating = 'Along the strip',
  walkability_subtext = 'Not a single town square',
  beach_type = 'Public',
  beach_type_subtext = 'Access along the stretch',
  dining_rating = 'Strong',
  dining_subtext = 'One of the better corridors',
  getting_around_summary = 'Walk • Drive',
  getting_around_subtext = 'Strip hopping is easy',
  highlights = ARRAY['Dining', 'Central Location', 'Beach Access', 'Casual'],
  beach_access_details = 'Beach access points along the main stretch. Some rentals walk; others are a quick drive to your preferred access.',
  getting_around_details = 'Walkable along the restaurant strip for hopping between spots. Not a single enclosed town square like Seaside or Rosemary.',
  dining_town_center_details = 'Casual lunches, seafood, and date-night spots without staying inside one planned town.',
  parking_details = 'Dinner-hour parking along 30A gets tight on weekends. Locals learn their favorite access points and backup restaurants.'
WHERE slug = 'seagrove-beach';

UPDATE public.towns SET
  at_a_glance_description = 'Old Florida character, sandy shoes welcome, and a loose rhythm around beach and casual food.',
  walkability_rating = 'Moderate',
  walkability_subtext = 'Beach neighborhood scale',
  beach_type = 'Public',
  beach_type_subtext = 'Near state park access',
  dining_rating = 'Casual icons',
  dining_subtext = 'Personality over polish',
  getting_around_summary = 'Walk • Bike • Drive',
  getting_around_subtext = 'Laid-back local pace',
  highlights = ARRAY['Local Character', 'Dog Friendly', 'Casual Dining', 'Beach Access'],
  beach_access_details = 'Small-town beach neighborhood with access near the state park area. Most visitors walk or bike from their rental.',
  getting_around_details = 'Compact enough for beach and casual meals on foot or bike from many rentals; drive when you want more restaurant choice east or west.',
  dining_town_center_details = 'Casual seafood, beach bars, and a few names everyone asks about. Less white-tablecloth than Rosemary, more personality.',
  parking_details = 'Iconic restaurants and beach lots fill on summer weekends. Weekdays are more forgiving if you time lunch and beach runs.'
WHERE slug = 'grayton-beach';

UPDATE public.towns SET
  at_a_glance_description = 'Resort pools and bike paths next door to Seaside energy.',
  walkability_rating = 'High inside',
  walkability_subtext = 'Paths to beach & Seaside',
  beach_type = 'Public',
  beach_type_subtext = 'Walk or bike from many rentals',
  dining_rating = 'Nearby',
  dining_subtext = 'Seaside walkable for many',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'Family-friendly paths',
  highlights = ARRAY['Family Friendly', 'Pools', 'Bike Friendly', 'Walkable'],
  beach_access_details = 'Bike paths connect to beach access. Many families bike to the sand; some rentals are closer than others.',
  getting_around_details = 'Inside the community, paths cover beach and Seaside runs. Car for groceries and farther corridor days.',
  dining_town_center_details = 'Stay local for quiet nights or walk into Seaside for the town green and a wider restaurant mix.',
  parking_details = 'Inside the neighborhood is easier than Seaside proper. You will still compete for tables if you cross into Seaside for dinner.'
WHERE slug = 'watercolor';

UPDATE public.towns SET
  at_a_glance_description = 'Higher dunes, local staples, and a calmer week without the town-square scene.',
  walkability_rating = 'Low',
  walkability_subtext = 'Neighborhood feel',
  beach_type = 'Public',
  beach_type_subtext = 'Local access points',
  dining_rating = 'Local + drives',
  dining_subtext = 'Staples close; variety east',
  getting_around_summary = 'Drive • Bike',
  getting_around_subtext = 'Quieter soundtrack',
  highlights = ARRAY['Quiet', 'Local Character', 'High Dunes', 'Repeat Visitors'],
  beach_access_details = 'Neighborhood feel with a handful of local access points. Most guests drive or bike to their preferred beach lot.',
  getting_around_details = 'You will drive more for nightlife than in Seaside or Rosemary. Bike works for nearby beach runs.',
  dining_town_center_details = 'A few local staples close by. Plan drives east to Grayton or Seagrove when you want more restaurant choice.',
  parking_details = 'Easier than Seaside or Rosemary at the town level. Favorite local spots still fill on perfect summer weekends.'
WHERE slug = 'blue-mountain-beach';

UPDATE public.towns SET
  at_a_glance_description = 'A wide zip code — your week depends on which neighborhood you actually booked.',
  walkability_rating = 'Varies widely',
  walkability_subtext = 'Check your rental pin',
  beach_type = 'Mixed',
  beach_type_subtext = 'Walkable pockets exist',
  dining_rating = 'Gulf Place + drives',
  dining_subtext = 'Village hub nearby',
  getting_around_summary = 'Drive',
  getting_around_subtext = 'Pin matters more than name',
  highlights = ARRAY['Spread Out', 'Gulf Place Access', 'House Groups'],
  beach_access_details = 'Could be walkable to a cluster or a short drive. Read the listing distance to beach access, not just the town name.',
  getting_around_details = 'Varies by neighborhood. Gulf Place and 98 corridors get busy in peak season; tucked-away rentals are calmer.',
  dining_town_center_details = 'Gulf Place for a village hub, or drive along 30A for restaurant corridors east and west.',
  parking_details = 'Varies by neighborhood. Gulf Place and corridor lots fill in peak season; quieter pockets are easier.'
WHERE slug = 'santa-rosa-beach';

UPDATE public.towns SET
  at_a_glance_description = 'Colorful village hub with shops, casual dining, and a relaxed meeting point in Santa Rosa Beach.',
  walkability_rating = 'High in village',
  walkability_subtext = 'Cluster for meals & browsing',
  beach_type = 'Public nearby',
  beach_type_subtext = 'Usually a short drive',
  dining_rating = 'On-site options',
  dining_subtext = 'Casual village dining',
  getting_around_summary = 'Walk • Drive',
  getting_around_subtext = 'Village is walkable',
  highlights = ARRAY['Village Hub', 'Casual Dining', 'Shopping', 'Live Music'],
  beach_access_details = 'The village is a dining and shopping cluster. Beach time is usually a short drive to your preferred access point.',
  getting_around_details = 'Walkable if your rental is in or next to the village. Many Santa Rosa addresses still require a drive here.',
  dining_town_center_details = 'Casual dining, live music in season, coffee to go — more useful and relaxed than a curated town green.',
  parking_details = 'Village lots fill around meal times and summer weekends. Weekday mornings are calmer for errands.'
WHERE slug = 'gulf-place';

UPDATE public.towns SET
  at_a_glance_description = 'Planned community with The Hub as the go-to for food, drinks, and events.',
  walkability_rating = 'Inside community',
  walkability_subtext = 'Hub covers dinner nights',
  beach_type = 'Public nearby',
  beach_type_subtext = 'Usually a short drive',
  dining_rating = 'The Hub',
  dining_subtext = 'On-site food & events',
  getting_around_summary = 'Walk • Drive',
  getting_around_subtext = 'Car for beach & exploring',
  highlights = ARRAY['The Hub', 'Family Friendly', 'Events', 'Pools'],
  beach_access_details = 'Residential community west on the corridor. Beach is part of the plan but usually a short drive from the house.',
  getting_around_details = 'For The Hub, often walkable. For beach days and exploring Grayton or Seaside, you will want a car.',
  dining_town_center_details = 'The Hub is the center of gravity — food, drinks, outdoor events. Less need to fight 30A traffic every night.',
  parking_details = 'The Hub fills on perfect weather weekends. Check the event calendar for the week you are visiting.'
WHERE slug = 'prominence';

UPDATE public.towns SET
  at_a_glance_description = 'Western end of 30A — more space, quieter streets, still close to Grayton and Seaside.',
  walkability_rating = 'Low',
  walkability_subtext = 'Spread-out residential',
  beach_type = 'Public',
  beach_type_subtext = 'Less crowded accesses',
  dining_rating = 'Drive east',
  dining_subtext = 'Quiet nights or corridor dining',
  getting_around_summary = 'Drive',
  getting_around_subtext = 'Space over foot traffic',
  highlights = ARRAY['Quiet', 'House Groups', 'Space', 'West End'],
  beach_access_details = 'Residential neighborhoods with spread-out access. Less crowded than iconic town centers farther east.',
  getting_around_details = 'Car-first base. You will still hit 30A traffic driving east for dinner on summer weekends.',
  dining_town_center_details = 'Stay west for quiet nights or drive toward Grayton, Gulf Place, and Seagrove for restaurant variety.',
  parking_details = 'Generally easier than mid-corridor towns. Peak weekends still add pressure when everyone drives east.'
WHERE slug = 'dune-allen-beach';
