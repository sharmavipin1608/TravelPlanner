# TravelPlanner — Design Spec

**Date:** 2026-05-19
**Status:** Approved
**Stack:** Next.js 15 (App Router) + Supabase + Vercel + Google Maps API + Claude API

---

## 1. Overview

TravelPlanner is a personal travel knowledge base with a map-first UI. Users save places, restaurants, accommodations, and activities as they discover them — from any source, any time. When planning a trip, they filter by destination to see everything saved on a map and pull relevant items into a trip plan.

---

## 2. Scope

### Phase 1 (this spec)
- Global save list with 4 categories + AI scratchpad
- Google Maps Places Autocomplete for adding items; manual text entry as fallback
- Map-first view: full-screen Google Map with color-coded pins by category, filterable side panel
- Destination-based querying ("show me everything I saved for Tokyo")
- Basic trip planning: create a trip, pull saved items into it, view on map
- Auth via Supabase (email/password)
- Responsive web app (desktop + mobile browser)

### Roadmap (out of scope for Phase 1)
- URL/reel import
- In-the-moment companion (live trip mode)
- Post-trip logging
- Collaborative trip planning
- Native mobile/desktop apps

---

## 3. Architecture

```
┌─────────────────────────────────────────┐
│           Next.js App (Vercel)          │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  App Router │  │   API Routes     │  │
│  │  (UI/Pages) │  │ /api/categorize  │  │
│  │             │  │ /api/items       │  │
│  └──────┬──────┘  └────────┬─────────┘  │
│         │                  │            │
└─────────┼──────────────────┼────────────┘
          │                  │
    ┌─────▼──────┐    ┌──────▼──────────┐
    │ Google Maps │    │    Supabase     │
    │  Places API │    │  - Auth         │
    │  Maps JS    │    │  - Postgres DB  │
    └────────────┘    │  - Row-level sec│
                      └─────────────────┘
                             │
                      ┌──────▼──────┐
                      │ Claude API  │
                      │ (scratchpad │
                      │  classify)  │
                      └─────────────┘
```

**Key decisions:**
- **App Router** with React Server Components for fast initial loads; client components only where required (map, autocomplete)
- **Supabase Row Level Security** from day one — every query scoped to the logged-in user, making Phase 2 collaboration a schema extension not a rewrite
- **Google Maps** loaded client-side only (browser SDK); Places Autocomplete runs in the browser, coordinates/metadata saved to Supabase
- **Claude API** called from server-side API route (`/api/categorize`) — API key never exposed to the browser

---

## 4. Data Model

### `items` — core table, all saved items
```sql
id              uuid primary key
user_id         uuid references auth.users
name            text
category        enum ('place', 'restaurant', 'accommodation', 'activity') nullable
                -- null = scratchpad entry pending AI categorization
destination     text        -- city-level, e.g. "Tokyo, Japan"
lat             float
lng             float
google_place_id text        -- populated if added via autocomplete
notes           text
metadata        jsonb       -- cuisine, stars, hours, photos, website, etc.
status          enum ('wishlist', 'planned', 'visited') default 'wishlist'
created_at      timestamptz
```

### `trips`
```sql
id              uuid primary key
user_id         uuid references auth.users
name            text        -- e.g. "Tokyo May 2026"
destination     text
start_date      date nullable
end_date        date nullable
created_at      timestamptz
```

### `trip_items` — join table
```sql
trip_id         uuid references trips
item_id         uuid references items
notes           text        -- trip-specific override
day_number      int nullable  -- for day-by-day planning (future)
```

### `scratchpad_entries`
```sql
id              uuid primary key
user_id         uuid references auth.users
raw_text        text
processed       boolean default false
created_item_id uuid references items nullable
created_at      timestamptz
```

**Scratchpad flow:** raw text → `scratchpad_entries` (processed=false) → `/api/categorize` calls Claude → structured item returned → inserted into `items` → `processed=true`, `created_item_id` set.

---

## 5. Pages & Routes

```
/                     Landing / login (redirects to /map if authenticated)
/map                  Main view: full-screen map + side panel
/map?destination=X    Destination-filtered map view
/add                  Add item: Google autocomplete or manual form
/scratchpad           Free-form entry → AI categorization flow
/trips                Trip list
/trips/[id]           Trip detail: map + items in this trip
/settings             Profile, connected services
```

---

## 6. UI Layout — Map-first

- Full-screen Google Map as the base layer
- Color-coded pins by category: red = restaurants, orange = places, blue = accommodations, green = activities
- Side panel (left on desktop, bottom sheet on mobile): filterable list of items
- Click a pin → item card appears with name, notes, category, "Add to trip" button
- Filter bar: All / Places / Restaurants / Accommodations / Activities + destination search
- "+" FAB (floating action button) to add a new item

---

## 7. Core User Flows

### Saving a discovered item
1. Tap "+" → choose Autocomplete or Scratchpad
2. **Autocomplete path:** type name → select from Google suggestions → category pre-filled from Google place type → save
3. **Scratchpad path:** type freely → Claude parses and returns structured suggestion → user confirms or edits → item saved

### Planning a trip
1. Create trip → name + destination
2. Navigate to `/map?destination=Tokyo` → all saved Tokyo pins visible
3. Tap pin → "Add to trip" → item added to trip
4. View `/trips/[id]` → map shows only trip items

---

## 8. Google Maps Integration

- **Places Autocomplete:** client-side; selecting a place populates name, address, lat/lng, `google_place_id`, and suggests category based on Google's place types
- **Maps JavaScript API:** displays the map; pins rendered as custom markers colored by category
- **Cost:** $200/month free credit covers personal use comfortably
- **Fallback:** if Maps unavailable, autocomplete degrades to plain text; lat/lng stays null; item still saves

---

## 9. Error Handling

| Scenario | Behavior |
|---|---|
| Google Maps unavailable | Autocomplete falls back to plain text; lat/lng null; item saves |
| Claude API fails on scratchpad | Entry stays `processed=false`; user sees "Couldn't categorize — tap to review manually" |
| Supabase auth expiry | Middleware redirects to login; session refresh attempted automatically first |
| Empty destination query | Empty state with prompt to add items for that destination |

---

## 10. Testing Strategy

### Unit tests (Vitest)
- Data model helpers
- Scratchpad parsing / category mapping logic
- Google place type → app category mapping

### Integration tests
- Supabase queries run against local Supabase instance (`supabase start`)
- API routes tested with real DB, no mocks

### Visual regression tests (Playwright + Docker)
- Workflow: finalize mockup → implement → run `playwright test --update-snapshots` to commit baseline PNGs
- Tests run inside Playwright's official Docker image for rendering consistency
- Baseline PNGs committed to git alongside tests
- Covers: map view, side panel, item card, add form, scratchpad flow, trip detail
- If false-positive rate becomes a problem, migrate to Percy (Playwright reporter swap, no test rewrites)

### E2E (Playwright)
- Add item via autocomplete
- Scratchpad → categorize → confirm
- Create trip → add items → view on map

---

## 11. Phase 2 Hooks (not built now, designed for)

- `user_id` on all tables + RLS means collaboration is an `access_grants` table away
- `trip_items.day_number` column ready for day-by-day itinerary planning
- `items.status` ('wishlist' → 'planned' → 'visited') supports in-the-moment and post-trip flows
- Auth via Supabase supports OAuth providers (Google, Apple) for mobile Phase 2
