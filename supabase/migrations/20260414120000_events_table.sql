-- Events table for time-sensitive content
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  hero_image_url text,

  -- Dates
  event_date date NOT NULL,
  end_date date, -- null means single-day event

  -- Location
  town_id integer REFERENCES towns(id),
  venue_name text,
  address text,
  lat numeric,
  lng numeric,

  -- Details
  price text, -- "Free", "$25", "Varies"
  website text,
  tags text[],

  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'cancelled')),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for efficient date filtering
CREATE INDEX idx_events_date ON events(event_date) WHERE status = 'active';
CREATE INDEX idx_events_end_date ON events(end_date) WHERE status = 'active';

-- Helper view for upcoming events (excludes past events)
CREATE OR REPLACE VIEW upcoming_events AS
SELECT e.*, t.name as town_name, t.slug as town_slug
FROM events e
LEFT JOIN towns t ON e.town_id = t.id
WHERE e.status = 'active'
  AND (e.end_date >= CURRENT_DATE OR (e.end_date IS NULL AND e.event_date >= CURRENT_DATE))
ORDER BY e.event_date ASC;

-- RLS policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT USING (true);

CREATE POLICY "Events are editable by admins"
  ON events FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );
