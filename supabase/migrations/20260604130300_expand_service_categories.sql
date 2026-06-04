-- Broaden vendor specialties beyond home trades (vendors.csv includes insurance, legal, medical, etc.).

INSERT INTO public.service_categories (title, slug, excerpt, sort) VALUES
  ('Insurance', 'insurance', 'Auto, home, life, and commercial insurance agencies', 170),
  ('Accounting & tax', 'accounting', 'CPA, bookkeeping, payroll, and tax prep', 180),
  ('Legal', 'legal', 'Attorneys and law firms', 190),
  ('Real estate & title', 'real_estate', 'Realtors, title, escrow, and closing services', 200),
  ('Financial advisory', 'financial', 'Wealth management and financial planning', 210),
  ('Health & medical', 'health_medical', 'Medical, dental, dermatology, and rehab practices', 220),
  ('Counseling', 'counseling', 'Therapy, counseling, and mental health', 230),
  ('Home improvement', 'home_improvement', 'Cabinets, closets, countertops, blinds, and interior build', 240),
  ('Home inspection', 'home_inspection', 'Residential and pre-purchase inspections', 250),
  ('Design & architecture', 'design_architecture', 'Interior design, architecture, and A&E firms', 260),
  ('Office & workspace', 'office_workspace', 'Coworking, flex space, and shared offices', 270),
  ('Security systems', 'security_systems', 'Alarms, monitoring, and home security', 280)
ON CONFLICT (slug) DO NOTHING;
