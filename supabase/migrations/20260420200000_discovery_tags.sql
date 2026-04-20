-- Discovery Tags for Editorial UI
-- These tags power the discovery chips on search and are displayed as editorial badges on listings

INSERT INTO tags (name, slug, category, display_order) VALUES
  ('Date Night', 'date-night', 'discovery', 10),
  ('Hidden Gem', 'hidden-gem', 'discovery', 20),
  ('Waterfront', 'waterfront', 'discovery', 30),
  ('Family Favorite', 'family-favorite', 'discovery', 40),
  ('Local Secret', 'local-secret', 'discovery', 50),
  ('Sunset Views', 'sunset-views', 'discovery', 60),
  ('Worth the Wait', 'worth-the-wait', 'discovery', 70),
  ('Quick Bite', 'quick-bite', 'discovery', 80),
  ('Brunch Spot', 'brunch-spot', 'discovery', 90),
  ('Pet Friendly', 'pet-friendly', 'discovery', 100)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;
