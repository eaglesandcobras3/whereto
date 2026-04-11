-- Reset categories to high-level parent categories
TRUNCATE public.categories CASCADE;

INSERT INTO public.categories (name, slug, google_types) VALUES
  ('Restaurants', 'restaurants', '["restaurant", "food", "cafe", "bar"]'),
  ('Stores', 'stores', '["store", "establishment", "shopping_mall", "clothing_store", "supermarket"]'),
  ('Services', 'services', '["health", "beauty_salon", "hair_care", "real_estate_agency", "lodging"]'),
  ('Activities', 'activities', '["park", "tourist_attraction", "museum", "gym", "entertainment"]'),
  ('Events', 'events', '["event_venue", "art_gallery", "movie_theater"]'),
  ('Beyond', 'beyond', '["point_of_interest"]');
