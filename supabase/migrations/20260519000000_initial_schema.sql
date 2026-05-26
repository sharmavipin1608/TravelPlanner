-- ─────────────────────────────────────────────────────────────
-- TravelPlanner — initial schema
-- ─────────────────────────────────────────────────────────────

-- Enums
CREATE TYPE item_category AS ENUM ('place', 'restaurant', 'accommodation', 'activity');
CREATE TYPE item_status   AS ENUM ('wishlist', 'planned', 'visited');

-- ── items ────────────────────────────────────────────────────
CREATE TABLE items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  name              text        NOT NULL,
  category          item_category,          -- null = pending AI categorization
  google_place_types text[],               -- raw types from Google Places API
  destination       text,                  -- "Tokyo, Japan"
  lat               double precision,
  lng               double precision,
  google_place_id   text,
  notes             text,
  metadata          jsonb       NOT NULL DEFAULT '{}',
  status            item_status NOT NULL DEFAULT 'wishlist',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_user_destination ON items (user_id, destination);
CREATE INDEX idx_items_user_category    ON items (user_id, category);

-- ── trips ────────────────────────────────────────────────────
CREATE TABLE trips (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  name         text        NOT NULL,
  destination  text,
  start_date   date,
  end_date     date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── trip_items ───────────────────────────────────────────────
CREATE TABLE trip_items (
  trip_id     uuid NOT NULL REFERENCES trips  ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES items  ON DELETE CASCADE,
  notes       text,
  day_number  int,
  PRIMARY KEY (trip_id, item_id)
);

CREATE INDEX idx_trip_items_trip ON trip_items (trip_id);

-- ── scratchpad_entries ───────────────────────────────────────
CREATE TABLE scratchpad_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  raw_text        text        NOT NULL,
  processed       boolean     NOT NULL DEFAULT false,
  created_item_id uuid        REFERENCES items ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratchpad_entries ENABLE ROW LEVEL SECURITY;

-- items: full CRUD for owner
CREATE POLICY "items: owner access" ON items
  FOR ALL USING (auth.uid() = user_id);

-- trips: full CRUD for owner
CREATE POLICY "trips: owner access" ON trips
  FOR ALL USING (auth.uid() = user_id);

-- trip_items: access if user owns the trip
CREATE POLICY "trip_items: owner access" ON trip_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_items.trip_id
        AND t.user_id = auth.uid()
    )
  );

-- scratchpad_entries: full CRUD for owner
CREATE POLICY "scratchpad_entries: owner access" ON scratchpad_entries
  FOR ALL USING (auth.uid() = user_id);
