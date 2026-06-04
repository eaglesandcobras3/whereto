-- Full service vendor taxonomy (~55 specialties). See docs/service-categories-taxonomy.md

ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS group_slug text;

-- Trades & outdoor (may already exist from earlier migrations)
INSERT INTO public.service_categories (title, slug, excerpt, sort, group_slug) VALUES
  ('Irrigation', 'irrigation', 'Sprinkler and irrigation systems', 25, 'outdoor_property'),
  ('Vacation rentals', 'vacation_rentals', 'STR and vacation rental management', 165, 'outdoor_property'),
  ('Home staging', 'home_staging', 'Staging homes for sale or rent', 166, 'outdoor_property'),
  ('Junk removal', 'junk_removal', 'Haul-away and debris removal', 55, 'home_trades'),
  ('Flooring', 'flooring', 'Tile, hardwood, carpet, epoxy floors', 95, 'home_trades'),
  ('Concrete & masonry', 'concrete_masonry', 'Concrete, block, retaining walls', 96, 'home_trades'),
  ('Exterior & openings', 'home_exterior', 'Windows, doors, gutters, fencing', 97, 'home_trades'),
  ('Appliance repair', 'appliance_repair', 'Household appliance service', 98, 'home_trades'),
  ('Solar & energy', 'solar_energy', 'Solar, generators, energy install', 99, 'home_trades'),
  ('Restoration', 'restoration', 'Fire, water, and mold restoration', 105, 'home_trades'),
  ('Staffing & recruiting', 'staffing', 'Employment and staffing agencies', 215, 'professional'),
  ('Engineering & survey', 'engineering_survey', 'Engineering, civil, surveying', 265, 'professional'),
  ('Veterinary', 'veterinary', 'Veterinary clinics', 235, 'health_wellness'),
  ('Salon & spa', 'salon_spa', 'Hair, nails, spa, med spa', 236, 'health_wellness'),
  ('Fitness & wellness', 'fitness_wellness', 'Pilates, yoga, gyms, training', 237, 'health_wellness'),
  ('Photography', 'photography', 'Photographers and studios', 275, 'creative_events'),
  ('Events & weddings', 'events_wedding', 'Planners, florists, DJs, weddings', 276, 'creative_events'),
  ('Event catering', 'catering_events', 'Catering for events (not restaurants)', 277, 'creative_events'),
  ('Marketing & creative', 'marketing_creative', 'Agencies, print, signage', 278, 'creative_events'),
  ('IT & computers', 'it_computer', 'IT support, MSP, web development', 285, 'tech_office'),
  ('Auto repair', 'auto_repair', 'Mechanics and body shops', 295, 'auto_transport'),
  ('Towing & transport', 'towing_transport', 'Tow, limo, private car service', 296, 'auto_transport'),
  ('Car rental', 'car_rental', 'Vehicle rental agencies', 297, 'auto_transport'),
  ('Education & childcare', 'education_childcare', 'Daycare, tutoring, lessons', 305, 'family_pets'),
  ('Pet services', 'pet_services', 'Grooming, boarding, pet training', 306, 'family_pets'),
  ('Storage', 'storage', 'Self-storage', 315, 'other_services'),
  ('Waste & septic', 'waste_septic', 'Septic, dumpsters, portable toilets', 316, 'other_services'),
  ('Laundry & dry clean', 'laundry_dry_clean', 'Dry cleaners and laundromats', 317, 'other_services')
ON CONFLICT (slug) DO UPDATE SET
  group_slug = EXCLUDED.group_slug,
  excerpt = COALESCE(public.service_categories.excerpt, EXCLUDED.excerpt);

-- Professional / health / creative rows from 20260604130300
INSERT INTO public.service_categories (title, slug, excerpt, sort, group_slug) VALUES
  ('Insurance', 'insurance', 'Insurance agencies', 170, 'professional'),
  ('Accounting & tax', 'accounting', 'CPA, bookkeeping, payroll', 180, 'professional'),
  ('Legal', 'legal', 'Attorneys and law firms', 190, 'professional'),
  ('Real estate & title', 'real_estate', 'Realtors, title, escrow', 200, 'professional'),
  ('Financial advisory', 'financial', 'Wealth and financial planning', 210, 'professional'),
  ('Health & medical', 'health_medical', 'Medical, dental, dermatology, rehab', 220, 'health_wellness'),
  ('Counseling', 'counseling', 'Therapy and mental health', 230, 'health_wellness'),
  ('Home improvement', 'home_improvement', 'Cabinets, closets, counters, blinds', 240, 'home_trades'),
  ('Home inspection', 'home_inspection', 'Home and pre-listing inspection', 250, 'home_trades'),
  ('Design & architecture', 'design_architecture', 'Interior design and architecture', 260, 'creative_events'),
  ('Office & workspace', 'office_workspace', 'Coworking and flex space', 270, 'tech_office'),
  ('Security systems', 'security_systems', 'Alarms and monitoring', 280, 'home_trades')
ON CONFLICT (slug) DO UPDATE SET group_slug = EXCLUDED.group_slug;

-- Backfill group_slug on original trade seeds
UPDATE public.service_categories SET group_slug = 'outdoor_property' WHERE slug IN ('landscaping', 'lawn_care', 'pool_spa', 'pest_control', 'property_management');
UPDATE public.service_categories SET group_slug = 'home_trades' WHERE slug IN (
  'cleaning', 'pressure_washing', 'plumbing', 'electrical', 'hvac', 'painting', 'handyman',
  'roofing', 'moving', 'contractors', 'home_improvement', 'home_inspection', 'security_systems',
  'junk_removal', 'flooring', 'concrete_masonry', 'home_exterior', 'appliance_repair', 'solar_energy', 'restoration'
);
UPDATE public.service_categories SET group_slug = 'marine' WHERE slug = 'marine_boat';
