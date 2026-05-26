# TravelPlanner — Design Spec

**Date:** 2026-05-19
**Status:** Approved
**Stack:** Next.js 15 (App Router) + Supabase + Vercel + Google Maps API + LLM Provider (swappable)

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
│         │           ┌──────▼──────────┐ │
│         │           │   AIService     │ │
│         │           │  (provider      │ │
│         │           │   abstraction)  │ │
│         │           └──────┬──────────┘ │
└─────────┼──────────────────┼────────────┘
          │                  │
    ┌─────▼──────┐    ┌──────▼──────────┐
    │ Google Maps │    │    Supabase     │
    │  Places API │    │  - Auth         │
    │  Maps JS    │    │  - Postgres DB  │
    └────────────┘    │  - Row-level sec│
                      └─────────────────┘
          │
  ┌───────▼────────────────────────────┐
  │         LLM Provider (env config)  │
  │  ClaudeProvider | OpenAIProvider   │
  │  GeminiProvider | MockProvider     │
  └────────────────────────────────────┘
```

**Key decisions:**
- **Single-screen SPA:** `/map` is the one and only view. Add-item, scratchpad, trips, and settings all open as modal overlays — the map never unmounts and state (selected pin, active trip, filters) is preserved across modal open/close.
- **App Router** with React Server Components for fast initial loads; client components only where required (map, autocomplete, modals)
- **Supabase Row Level Security** from day one — every query scoped to the logged-in user, making Phase 2 collaboration a schema extension not a rewrite
- **Google Maps** loaded client-side only (browser SDK); Places Autocomplete runs in the browser, coordinates/metadata saved to Supabase
- **AIService** called from server-side API route (`/api/categorize`) — provider and API keys never exposed to the browser; swapped via `LLM_PROVIDER` env var

---

## 4. AI Service

The app talks to one internal `AIService`. The LLM provider underneath is a config detail.

### Interface

```ts
interface LLMProvider {
  complete(prompt: string): Promise<string>
}

interface AIService {
  categorize(rawText: string): Promise<CategorizedItem>
}

interface CategorizedItem {
  name: string
  category: 'place' | 'restaurant' | 'accommodation' | 'activity' | null
  destination: string | null   // best-guess city, e.g. "Osaka, Japan"
  notes: string | null
}
```

### Providers

| Provider | Env var value | Notes |
|---|---|---|
| `ClaudeProvider` | `claude` | Default |
| `OpenAIProvider` | `openai` | Drop-in swap |
| `GeminiProvider` | `gemini` | Drop-in swap |
| `MockProvider` | `mock` | Returns canned responses; used in tests |

Switching provider = change `LLM_PROVIDER` in `.env`. No app code changes.

### Prompt ownership

The prompt template lives in `AIService`, not in any provider. Providers only handle auth and the raw API call. This ensures prompt changes don't require touching provider code.

### When AIService is called

- **Autocomplete path:** NOT called. Google's place types map deterministically to our 4 categories (see Section 9). No LLM needed.
- **Scratchpad path:** Called for every unprocessed `scratchpad_entry`. Input = raw text. Output = `CategorizedItem`.
- **Manual entry:** NOT called. User picks the category themselves.

---

## 5. Data Model

### `items` — core table, all saved items
```sql
id                  uuid primary key
user_id             uuid references auth.users
name                text
category            enum ('place', 'restaurant', 'accommodation', 'activity') nullable
                    -- null = scratchpad entry pending AI categorization
google_place_types  text[]
                    -- raw types from Google, e.g. ["cafe", "food", "establishment"]
                    -- used to auto-populate category via mapping; null if added manually
destination         text        -- city-level, e.g. "Tokyo, Japan"
lat                 float
lng                 float
google_place_id     text        -- populated if added via autocomplete
notes               text
metadata            jsonb       -- cuisine, stars, hours, photos, website, etc.
status              enum ('wishlist', 'planned', 'visited') default 'wishlist'
created_at          timestamptz
```

**Category mapping from Google place types (deterministic, no LLM):**
```
cafe, restaurant, bar, bakery, food, meal_delivery  →  'restaurant'
lodging, hotel, motel, campground                   →  'accommodation'
tourist_attraction, museum, park, amusement_park,
  art_gallery, zoo, natural_feature                 →  'place'
gym, spa, stadium, golf_course, bowling_alley       →  'activity'
(unmatched / point_of_interest / establishment)     →  null (user picks)
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

**Scratchpad flow:** raw text → `scratchpad_entries` (processed=false) → `/api/categorize` → `AIService.categorize()` → structured `CategorizedItem` returned → inserted into `items` → `processed=true`, `created_item_id` set.

---

## 6. Pages & Routes

Only three routes exist. Everything else is a modal overlay on `/map`.

```
/          Landing — redirects to /map if authenticated, /login if not
/login     Email/password auth (sign in + sign up)
/map       The entire app — map + sidebar + all modal flows
```

### Modal inventory (all rendered over `/map`)

| Modal | Trigger | Purpose |
|---|---|---|
| `AutocompleteAdd` | FAB → "Search a place" or "Add manually" | Google Places search → save item |
| `Scratchpad` | FAB → "Scratchpad" or sidebar sparkle button or footer "N to triage" | Free-text AI categorization |
| `TripsModal` | Sidebar footer "Trips" button | View/create trips, activate trip planning mode |
| `SettingsModal` | Sidebar settings gear (top-right of brand row) | Pin style, density, legend toggle |

### Trip planning mode (no separate route)
Activating a trip from `TripsModal` sets `activeTripId` in `/map` state. This does not navigate anywhere — it adds a trip pill to the sidebar and changes the item card action to an "Add to / Remove from [trip name]" toggle. Deactivating clears the pill.

---

## 7. UI Layout — Map-first

### Shell
Full-screen Google Map as the base layer. Sidebar fixed left (380px). Everything else is absolutely positioned over the map.

### Sidebar (left, 380px, top to bottom)

**Brand row**
- Red pin logo + "Wayfare" (serif) + "YOUR TRAVEL ATLAS" (uppercase, muted)
- Settings gear icon — top-right of brand row — opens `SettingsModal`

**Add a place CTA**
- Dark/ink-colored button spanning full width
- Left: search icon + "Add a place" title + "search Google Places" subtitle
- Right: sparkle icon button — opens `Scratchpad` modal directly (secondary action)
- Clicking the main button body opens `AutocompleteAdd` modal

**Search**
- "Search saved places" input — filters the item list by name, notes, or area in real-time

**Destination chips**
- Label: "DESTINATION"
- Pill chips: "All" (selected = dark/ink fill) + one chip per distinct destination derived from saved items
- Selecting a chip filters the list AND switches the map to local view for that city

**Category grid (2×2)**
- Restaurants (red dot) | Places (orange dot)
- Stays (blue dot)      | Activities (green dot)
- Each cell shows the count of items in that category (filtered to active destination if one is set)
- Active category = outlined border in category color; inactive = plain background
- Tapping toggles the category filter; tapping again deactivates (returns to "all")

**Item list**
- Header: "N SAVED PLACES" (count of currently filtered items) + status dropdown (All / Wishlist / Planned / Visited)
- Each row: color dot (category) · name (medium weight) · area + cuisine + price level (muted) · 2-line notes preview · status dot (right edge)
- Selected row has a slightly darker background
- Empty state: "Nothing saved here yet." + body copy + "Open scratchpad" button with sparkle icon

**Active trip pill** (shown only when a trip is active)
- Warm amber background, suitcase icon
- "Planning · [trip name]" + "[N] stops · tap pins to add"
- × button to deactivate trip planning mode

**Footer**
- "Trips [N]" button (suitcase icon + count) — opens `TripsModal`
- "✦ N to triage" button (sparkle icon) — shows only when unprocessed scratchpad entries exist; opens `Scratchpad` modal; styled in amber/alert color to draw attention

### Map overlays

**Map bar (top-right)**
- Frosted-glass pill
- World view: globe icon + "**World** · N saved across N" (total items + destination count)
- Local view: pin icon + "**[City]** · N saved" + "← Back to world" button

**Zoom controls (bottom-right, above FAB)**
- Stacked +/− buttons, frosted-glass style

**FAB (bottom-right)**
- 56px dark/ink circle, "+" icon
- On tap: rotates 45° into "×" and `AddMenu` popup rises above it
- `AddMenu` has three rows:
  - **Search a place** — amber icon, "Autocomplete from Google · auto-categorized"
  - **Scratchpad** — green icon, "Type anything · AI sorts it"
  - **Add manually** — blue icon, "Name + category · for offline notes"
- Tapping outside the menu closes it and rotates FAB back to "+"

**Category legend (bottom-left)**
- Frosted-glass pill: Restaurants · Places · Stays · Activities with their color dots

**Item card (top-left, appears on pin click)**
- 340px wide, floating, slide-in animation
- Header: gradient background using category hue, photo placeholder, category tag (color dot + label), close button
- Body: serif name (22px), area + destination + price level, hours in monospace pill (if available), notes text
- Actions row:
  - Without active trip: "Add to a trip" button (opens `TripsModal`) + edit icon + layers icon
  - With active trip: toggle button — dark "Add to [trip]" → green "✓ Added to [trip]" on second tap

---

## 8. Core User Flows

### Saving via autocomplete
1. Tap FAB → Add Menu appears → tap "Search a place"
2. `AutocompleteAdd` modal opens — large search input (autofocused)
3. Type → results list appears: place name, area, Google type tag
4. Tap a result → collapses to detail view:
   - 2×2 grid: Google types | Mapped category (color dot, editable) | Status segment (wishlist/planned/visited) | Destination
   - Notes textarea
5. Tap "Save place" → item inserted → modal closes → new pin appears on map → map auto-focuses to item's destination

### Saving via scratchpad
1. Tap FAB → "Scratchpad" (or sidebar sparkle, or footer "N to triage")
2. `Scratchpad` modal opens — compose textarea + "Sort it" button (⌘+Enter shortcut)
3. Submit → entry added to list in **pending** state
4. Immediately transitions to **thinking** state — animated pulse dots, "Claude is reading…"
5. AI returns → entry enters **review** state:
   - Italic quote of the raw text
   - 2×2 inline-editable grid: Name | Category (dropdown) | Destination | Area / Notes
   - Actions: "discard" · "re-run" · "Save place" (primary)
6. Tap "Save place" → item inserted → entry removed from scratchpad list
7. Footer badge count decrements; disappears at zero

### Planning a trip
1. Tap footer "Trips" → `TripsModal` opens
2. Tap a trip row → activates trip planning mode (modal closes)
3. Trip pill appears in sidebar: "Planning · [name] · N stops · tap pins to add"
4. Tap any pin on the map → item card shows "Add to [trip]" (dark button)
5. Tap "Add to [trip]" → button turns green "✓ Added to [trip]"; item status set to `planned`; tap again to remove
6. Tap × on trip pill to exit planning mode

### Creating a trip
1. `TripsModal` → tap "New trip" row
2. Inline create form expands: name input + destination input + Cancel/Create buttons
3. Create → new trip row appears, trip is activated automatically

---

## 9. Google Maps Integration

### Map modes
The map has two display modes that switch automatically based on the destination filter:

- **World mode** (no destination selected): one cluster marker per destination. Each cluster is a circle showing the total item count with a category-color pie chart segment mix. Clicking a cluster zooms to that city and activates local mode.
- **Local mode** (destination selected): individual pins for every item in that destination. Map uses `fitBounds` to the city bounding box with smooth animation. Map bar shows "Back to world" button.

### Pins
Custom `AdvancedMarker` HTML elements. Three styles (user-selectable in Settings):
- **Teardrop** (default): classic pin shape with category glyph inside (fork / mountain / bed / star)
- **Dot**: filled circle with category glyph
- **Ring**: white circle with category-colored border and center dot

Pin colors use `oklch(0.62 0.16 [hue])` matching category hues:
```
restaurant    hue 14   (warm red)
place         hue 36   (orange)
accommodation hue 216  (blue)
activity      hue 152  (green)
```

Pins outside the active filter are dimmed (opacity 0.25) rather than hidden — visual continuity while toggling.

Selected pin: slightly enlarged + drop shadow.

### Places Autocomplete
Client-side; selecting a place populates name, address, lat/lng, `google_place_id`, and the raw `google_place_types` array. City extracted from `address_components` (locality + country) to populate `destination`.

### Category mapping
`google_place_types[0]` (most specific type) mapped to our 4-category enum via `lib/google-maps/place-type-map.ts`. No LLM needed for this path.

### Cost & fallback
- $200/month free credit covers personal use comfortably
- If Maps unavailable: autocomplete degrades to plain text; lat/lng and `google_place_types` stay null; item still saves; user picks category manually; map area shows an error state

---

## 10. Design System

### Color palette
```
--paper:    #faf6ec   (background, sidebar)
--paper-2:  #f3ecd9   (input backgrounds, hover states)
--paper-3:  #ebe2c9   (borders, dividers)
--ink:      #2a2418   (primary text, dark buttons, FAB)
--ink-2:    #4a4030   (secondary text)
--ink-3:    #7a6d56   (muted text, placeholders, icons)
```

Category colors use `oklch` for perceptual uniformity:
```
restaurant    oklch(0.62 0.16 14)    warm red
place         oklch(0.62 0.16 36)    orange
accommodation oklch(0.62 0.16 216)   blue
activity      oklch(0.62 0.16 152)   green
```

### Typography
- **Inter** — all UI chrome (labels, buttons, inputs, meta)
- **Source Serif 4** — place names in item card, modal titles, trip names
- **JetBrains Mono** — hours, Google type tags, scratchpad hint text

### Settings modal
Accessible from the gear icon in the sidebar brand row. Contains:

| Setting | Options | Default |
|---|---|---|
| Pin style | Teardrop · Dot · Ring | Teardrop |
| Density | Compact · Regular · Comfy | Regular |
| Show legend | Toggle | On |

Density controls sidebar row padding via a CSS variable (`--pad-y`): Compact = 10px, Regular = 13px, Comfy = 18px.

User preferences stored in `localStorage` (no server round-trip needed).

---

## 11. Error Handling

| Scenario | Behavior |
|---|---|
| Google Maps unavailable | Autocomplete falls back to plain text; lat/lng and google_place_types null; user picks category manually |
| AI service fails on scratchpad | Entry stays `processed=false`; user sees "Couldn't categorize — tap to review manually" |
| LLM provider swap mid-session | Stateless API route picks up new `LLM_PROVIDER` on next request; no restart needed |
| Supabase auth expiry | Middleware redirects to login; session refresh attempted automatically first |
| Empty destination query | Empty state with prompt to add items for that destination |

---

## 12. Testing Strategy

### Unit tests (Vitest)
- `AIService.categorize()` using `MockProvider` — no real LLM calls in tests
- Google place type → category mapping function (`lib/google-place-type-map.ts`)
- Data model helpers

### Integration tests
- Supabase queries run against local Supabase instance (`supabase start`)
- API routes tested with real DB + `MockProvider`; no external API calls

### Visual regression tests (Playwright + Docker)
- Workflow: finalize mockup → implement → run `playwright test --update-snapshots` to commit baseline PNGs
- Tests run inside Playwright's official Docker image for rendering consistency
- Baseline PNGs committed to git alongside tests
- Covers: map view, side panel, item card, add form, scratchpad flow, trip detail
- If false-positive rate becomes a problem, migrate to Percy (Playwright reporter swap, no test rewrites)

### E2E (Playwright)
- Add item via autocomplete (verify google_place_types stored + category auto-mapped)
- Scratchpad → categorize → confirm (uses MockProvider)
- Create trip → add items → view on map

---

## 13. Phase 2 Hooks (not built now, designed for)

- `user_id` on all tables + RLS means collaboration is an `access_grants` table away
- `trip_items.day_number` column ready for day-by-day itinerary planning
- `items.status` ('wishlist' → 'planned' → 'visited') supports in-the-moment and post-trip flows
- `google_place_types` stored raw enables richer sub-filtering (e.g. "show only cafes") without schema changes
- Auth via Supabase supports OAuth providers (Google, Apple) for mobile Phase 2
- LLM provider abstraction means AI features can be upgraded or cost-optimized without touching app logic
