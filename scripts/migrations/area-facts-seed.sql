/**
 * Seed area “at a glance” facts after scripts/migrations/area-facts.sql.
 * Idempotent: re-run updates the same columns by slug.
 * Sourced from the former hardcoded AREA_PLANNING profiles.
 */

UPDATE public.areas SET
  at_a_glance_description = 'Cobblestone loop of shops and restaurants — where Rosemary actually gathers.',
  walkability_rating = 'High',
  walkability_subtext = 'Compact town-center loop',
  beach_type = 'Few blocks south',
  beach_type_subtext = 'Short walk through neighborhood streets',
  dining_rating = 'Walkable',
  dining_subtext = 'Coffee to upscale dinner',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'Car rarely needed in the center',
  highlights = ARRAY[
    'Walkable shopping',
    'Dinner without driving',
    'Evening strolls'
  ],
  beach_access_details = 'The town center sits inland from the sand. Beach access is a short walk south through neighborhood streets.',
  getting_around_details = 'Rosemary''s center is built for walking and biking. Most guests leave the car parked once they arrive.',
  dining_town_center_details = 'Coffee to upscale dinner on foot. Most guests eat here multiple nights without getting in the car.',
  parking_details = 'Town-center lots fill on summer weekends. Walking from your rental beats circling if you''re staying nearby.'
WHERE slug = 'rosemary-beach-town-center';

UPDATE public.areas SET
  at_a_glance_description = 'The postcard square — pastel cottages, food windows, and the amphitheater lawn.',
  walkability_rating = 'High',
  walkability_subtext = 'Coffee to beach on foot',
  beach_type = 'Short walk',
  beach_type_subtext = 'Public access from Central Square',
  dining_rating = 'On the square',
  dining_subtext = 'Go early or late in peak season',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'Biking beats circling for parking',
  highlights = ARRAY[
    'First-time 30A visitors',
    'Family town-square energy',
    'Iconic photos'
  ],
  beach_access_details = 'Central Square is a short walk from public beach access. Most visitors walk or bike from here.',
  getting_around_details = 'Limited town parking. Biking or walking from your rental is easier than circling on busy Saturdays.',
  dining_town_center_details = 'Airstream tacos, sit-down restaurants, and sweets around the green. Go early or late to skip the crush.',
  parking_details = 'Limited town parking. Biking or walking from your rental is easier than circling on busy Saturdays.'
WHERE slug = 'seaside-town-center';

UPDATE public.areas SET
  at_a_glance_description = 'White-walled streets and polished dining inside Alys''s curated loop.',
  walkability_rating = 'High inside',
  walkability_subtext = 'Easy within the community',
  beach_type = 'Short walk',
  beach_type_subtext = 'Pedestrian paths to the sand',
  dining_rating = 'Reservations help',
  dining_subtext = 'Evenings feel like the main event',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'Car rarely needed for dinner',
  highlights = ARRAY[
    'Upscale dinners',
    'Design-forward strolls',
    'Quiet evenings'
  ],
  beach_access_details = 'Pedestrian paths connect the center to beach access inside the community. Most guests walk or bike.',
  getting_around_details = 'Follow current guest parking rules for Alys. Staying inside the community means less daily driving.',
  dining_town_center_details = 'Polished restaurants and cocktail spots. Evenings feel like the main event.',
  parking_details = 'Follow current guest parking rules for Alys. Staying inside the community means less daily driving.'
WHERE slug = 'alys-beach-town-center';

UPDATE public.areas SET
  at_a_glance_description = 'Outdoor retail row with easy parking on the eastern end of 30A.',
  walkability_rating = 'Along the strip',
  walkability_subtext = 'Park once, browse on foot',
  beach_type = 'Short drive',
  beach_type_subtext = 'Shopping stop, not beachfront',
  dining_rating = 'Strip restaurants',
  dining_subtext = 'Breakfast through casual dinner',
  getting_around_summary = 'Walk • Drive',
  getting_around_subtext = 'Easier parking than Rosemary',
  highlights = ARRAY[
    'Park-once shopping',
    'Casual family meals',
    'East-end errands'
  ],
  beach_access_details = '30Avenue is a shopping stop, not beachfront. The sand is a short drive or bike ride away.',
  getting_around_details = 'Surface lots around the development. Easier than Rosemary or Seaside, but holiday weekends still fill.',
  dining_town_center_details = 'Breakfast through casual dinner along one walkable row. Good when you want one stop for the whole group.',
  parking_details = 'Surface lots around the development. Easier than Rosemary or Seaside, but holiday weekends still fill.'
WHERE slug = 'inlet-beach-30avenue';

UPDATE public.areas SET
  at_a_glance_description = 'Compact village of boutiques and casual dining in the middle of Seacrest.',
  walkability_rating = 'Village loop',
  walkability_subtext = 'Neighborhood shopping on foot',
  beach_type = 'Short walk or drive',
  beach_type_subtext = 'Depends on your rental pin',
  dining_rating = 'Casual',
  dining_subtext = 'Lunch and early dinner',
  getting_around_summary = 'Walk • Bike',
  getting_around_subtext = 'Walk from nearby rentals',
  highlights = ARRAY[
    'Lunch between beach and pool',
    'Neighborhood shopping',
    'Low-friction meals'
  ],
  beach_access_details = 'Depends on your rental. Many guests walk or bike; others are a quick drive to preferred access.',
  getting_around_details = 'Small lots. Walking from a nearby rental is easier than driving in for every meal.',
  dining_town_center_details = 'Casual lunch and early dinner. Strong when you want food close to home base without a big night out.',
  parking_details = 'Small lots. Walking from a nearby rental is easier than driving in for every meal.'
WHERE slug = 'seacrest-peddlers-pavilion';

UPDATE public.areas SET
  at_a_glance_description = 'Food-hall hub where everyone picks their own thing — easy group nights.',
  walkability_rating = 'Hub loop',
  walkability_subtext = 'Outdoor seating and stalls',
  beach_type = 'Short drive',
  beach_type_subtext = 'Inland from the sand',
  dining_rating = 'Food hall',
  dining_subtext = 'No single group reservation',
  getting_around_summary = 'Drive • Bike',
  getting_around_subtext = 'Shared lot for the hub',
  highlights = ARRAY[
    'Picky eaters',
    'Weeknight dinners',
    'Kids who need room to move'
  ],
  beach_access_details = 'The Big Chill is inland from the beach. Plan a short drive or bike for sand time.',
  getting_around_details = 'Shared lot for the hub. Peak dinner windows fill on perfect weather nights.',
  dining_town_center_details = 'Multiple stalls under one roof with outdoor seating. No single reservation for the whole group.',
  parking_details = 'Shared lot for the hub. Peak dinner windows fill on perfect weather nights.'
WHERE slug = 'watersound-big-chill';

UPDATE public.areas SET
  at_a_glance_description = 'Main parking lot and shuttle hub — plus coffee and shops before you hit the beach strip.',
  walkability_rating = 'Parking hub',
  walkability_subtext = 'Shuttle into the beach district',
  beach_type = 'Shuttle to sand',
  beach_type_subtext = 'Free shuttle to historic Grayton',
  dining_rating = 'Coffee + casual',
  dining_subtext = 'Breakfast before the beach',
  getting_around_summary = 'Park • Shuttle',
  getting_around_subtext = 'Arrive early on summer weekends',
  highlights = ARRAY[
    'Beach-day parking',
    'Shuttle into Grayton',
    'Morning coffee runs'
  ],
  beach_access_details = 'Park here and take the free shuttle into the historic beach district. Less circling in tight lanes.',
  getting_around_details = 'This is the main public lot for Grayton Beach days. Arrive early on summer weekends.',
  dining_town_center_details = 'Black Bear Bread and nearby spots for breakfast. Dinner is usually farther toward the beach strip.',
  parking_details = 'This is the main public lot for Grayton Beach days. Arrive early on summer weekends.'
WHERE slug = 'grayton-central';

UPDATE public.areas SET
  at_a_glance_description = 'Outdoor shopping street with movies, national retail, and big-lot parking.',
  walkability_rating = 'Main street',
  walkability_subtext = 'Outdoor retail loop',
  beach_type = 'Drive to sand',
  beach_type_subtext = 'Shopping district, not beachfront',
  dining_rating = 'Wide variety',
  dining_subtext = 'Chain and local mix',
  getting_around_summary = 'Walk • Drive',
  getting_around_subtext = 'Large shared lots',
  highlights = ARRAY[
    'Rainy-day backup',
    'Errands and movies',
    'Destin-area convenience'
  ],
  beach_access_details = 'Shopping district, not beachfront. Beach is a short drive toward the gulf.',
  getting_around_details = 'Large shared lots. Movie and dinner times stack up on holiday weekends.',
  dining_town_center_details = 'Chain and local mix — good for covering different tastes in one trip.',
  parking_details = 'Large shared lots. Movie and dinner times stack up on holiday weekends.'
WHERE slug = 'sandestin-grand-boulevard';

UPDATE public.areas SET
  at_a_glance_description = 'Large open-air district with national anchors, pier energy, and PCB scale.',
  walkability_rating = 'Open-air mall',
  walkability_subtext = 'Built for volume shopping',
  beach_type = 'Near the pier',
  beach_type_subtext = 'Walkable from parts of the complex',
  dining_rating = 'Strip variety',
  dining_subtext = 'Casual chains to seafood',
  getting_around_summary = 'Walk • Drive',
  getting_around_subtext = 'Multiple lots along the district',
  highlights = ARRAY[
    'One-stop shopping',
    'Rainy days',
    'Big-night-out energy'
  ],
  beach_access_details = 'Close to the pier and front-beach zone. Some visitors park here and walk to the sand.',
  getting_around_details = 'Multiple lots along the district. Events and holidays fill fast near the main strip.',
  dining_town_center_details = 'Everything from casual chains to seafood on the strip. Built for volume, not intimacy.',
  parking_details = 'Multiple lots along the district. Events and holidays fill fast near the main strip.'
WHERE slug = 'panama-city-beach-pier-park';
