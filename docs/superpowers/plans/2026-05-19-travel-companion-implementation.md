# TravelPlanner Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a map-first personal travel knowledge base — full-screen Google Map, filterable sidebar, modal overlays for all flows (add, scratchpad, trips, settings). No separate pages beyond `/`, `/login`, `/map`.

**Architecture:** Next.js 15 App Router. `/map` is the single app view — all flows (add item, scratchpad, trips, settings) open as modal overlays so the map never unmounts. Supabase handles auth + PostgreSQL with RLS. AIService wraps swappable LLM providers and is called only from `/api/categorize` (never the browser). Google Maps `AdvancedMarker` for custom HTML pins; world/local mode driven by the active destination filter.

**Tech Stack:** Next.js 15, TypeScript, pnpm, Supabase CLI, `@vis.gl/react-google-maps`, `@supabase/ssr`, `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`, Vitest, Playwright, Vercel

**Spec:** `docs/superpowers/specs/2026-05-19-travel-companion-design.md`
**Design reference:** `~/Downloads/TravelPlanner_design/` (panel.jsx, modals.jsx, app.jsx, styles.css — adapt all Leaflet code to Google Maps AdvancedMarker)

---

## File Map

```
.env.example
.env.local                              ← gitignored
next.config.ts
vitest.config.ts
playwright.config.ts

supabase/migrations/
  20260519000000_initial_schema.sql     ← items, trips, trip_items, scratchpad_entries + RLS

src/
  app/
    layout.tsx                          ← font imports (Inter, Source Serif 4, JetBrains Mono)
    globals.css                         ← CSS custom properties, component base styles
    page.tsx                            ← redirect: authed → /map, unauthed → /login
    (auth)/login/page.tsx               ← email/password sign in + sign up
    map/page.tsx                        ← top-level: composes Sidebar + MapView + all modals
    api/
      items/route.ts                    ← GET (list) + POST (create)
      trips/route.ts                    ← GET + POST
      trip-items/route.ts               ← POST (add) + DELETE (remove)
      categorize/route.ts               ← POST: calls AIService.categorize()

  components/
    sidebar/
      sidebar.tsx                       ← full sidebar shell (brand → footer)
      destination-chips.tsx             ← "All" + one chip per destination
      category-grid.tsx                 ← 2×2 grid with counts + active state
      item-list.tsx                     ← filtered list + empty state
      item-row.tsx                      ← single row (dot, name, meta, notes preview)
      active-trip-pill.tsx              ← amber pill; shown only when activeTripId set
    map/
      map-view.tsx                      ← 'use client'; world/local mode, AdvancedMarkers
      cluster-marker.tsx                ← SVG pie bubble for world mode
      pin-marker.tsx                    ← AdvancedMarker wrapping pin HTML
      item-card.tsx                     ← floating card on pin click
      map-bar.tsx                       ← top-right frosted-glass pill
      zoom-controls.tsx                 ← stacked +/− buttons
      category-legend.tsx               ← bottom-left frosted-glass legend
    modals/
      autocomplete-add.tsx              ← 'use client'; Places Autocomplete → save form
      scratchpad.tsx                    ← 'use client'; 3-state: pending→thinking→review
      scratchpad-row.tsx                ← single entry with state machine
      trips-modal.tsx                   ← list trips + create form + activate
      settings-modal.tsx                ← pin style / density / legend toggles
      add-menu.tsx                      ← FAB popup with 3 rows
    ui/
      fab.tsx                           ← 56px dark circle; rotates to × when open
      modal-base.tsx                    ← backdrop + centered panel + close on outside click
      icon.tsx                          ← SVG icon registry (all icons from design)

  hooks/
    use-settings.ts                     ← localStorage: pinStyle, density, showLegend
    use-filters.ts                      ← filter state: q, destination, category, status
    use-map-mode.ts                     ← 'world' | 'local' derived from filters.destination
    use-trip.ts                         ← activeTripId, activeTrip, toggleItemInTrip

  lib/
    supabase/
      client.ts                         ← browser client (singleton)
      server.ts                         ← server client (cookies)
    ai/
      types.ts                          ← LLMProvider, CategorizedItem interfaces
      ai-service.ts                     ← AIService.categorize()
      providers/
        mock-provider.ts
        claude-provider.ts
        openai-provider.ts
        gemini-provider.ts
      factory.ts                        ← createProvider(env) → LLMProvider
    google-maps/
      place-type-map.ts                 ← deterministic google_place_types[0] → category
      pin-html.ts                       ← pinHTML(item, style, selected, dimmed) → string
      cluster-html.ts                   ← clusterHTML(dest, count, cats, dimmed) → string
      city-bbox.ts                      ← CITY_BBOX record keyed by destination string
      category-meta.ts                  ← CATEGORY_META: hue, label per category

  types/
    index.ts                            ← Item, Trip, TripItem, ScratchpadEntry, Category, Status

  middleware.ts                         ← auth redirect

tests/
  unit/
    place-type-map.test.ts
    ai-service.test.ts
    pin-html.test.ts
  integration/
    items-api.test.ts
    categorize-api.test.ts
e2e/
  add-item.spec.ts
  scratchpad.spec.ts
  trip-planning.spec.ts
```

---

## Key Interfaces

The Coder must use these exact shapes — they are the contract between layers.

```ts
// types/index.ts
type Category = 'place' | 'restaurant' | 'accommodation' | 'activity'
type Status   = 'wishlist' | 'planned' | 'visited'

interface Item {
  id: string
  user_id: string
  name: string
  category: Category | null      // null = scratchpad entry pending categorization
  google_place_types: string[] | null
  destination: string            // "Tokyo, Japan"
  lat: number
  lng: number
  google_place_id: string | null
  notes: string | null
  metadata: Record<string, unknown>
  status: Status
  created_at: string
}

interface Trip {
  id: string
  user_id: string
  name: string
  destination: string
  start_date: string | null
  end_date: string | null
  created_at: string
}

interface TripItem {
  trip_id: string
  item_id: string
  notes: string | null
  day_number: number | null
}

interface ScratchpadEntry {
  id: string
  user_id: string
  raw_text: string
  processed: boolean
  created_item_id: string | null
  created_at: string
}
```

```ts
// lib/ai/types.ts
interface LLMProvider {
  complete(prompt: string): Promise<string>
}

interface CategorizedItem {
  name: string
  category: Category | null
  destination: string | null
  notes: string | null
}

interface AIService {
  categorize(rawText: string): Promise<CategorizedItem>
}
```

```ts
// API response shape — all routes return this
interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
}
```

```ts
// hooks/use-settings.ts
interface Settings {
  pinStyle: 'teardrop' | 'dot' | 'ring'
  density: 'compact' | 'regular' | 'comfy'
  showLegend: boolean
}
```

```ts
// lib/google-maps/category-meta.ts
interface CategoryMeta {
  hue: number    // for oklch(0.62 0.16 {hue})
  label: string  // "Restaurants" | "Places" | "Stays" | "Activities"
  glyph: 'fork' | 'mountain' | 'bed' | 'star'
}

const CATEGORY_META: Record<Category, CategoryMeta> = {
  restaurant:    { hue: 14,  label: 'Restaurants', glyph: 'fork' },
  place:         { hue: 36,  label: 'Places',       glyph: 'mountain' },
  accommodation: { hue: 216, label: 'Stays',        glyph: 'bed' },
  activity:      { hue: 152, label: 'Activities',   glyph: 'star' },
}
```

---

## Non-Obvious Decisions (read before coding)

1. **Map never unmounts.** `/map/page.tsx` renders `MapView` unconditionally. Modals render over it with `position: fixed`. Never conditionally render `MapView` based on modal state.

2. **World vs local mode** is derived state — not stored state. `use-map-mode.ts` returns `'world'` when `filters.destination` is null, `'local'` otherwise. No separate toggle needed.

3. **Cluster markers in world mode** use `AdvancedMarker` with a `div` containing inline SVG (see `cluster-html.ts`). Each cluster is keyed to a destination string. Click on cluster → set `filters.destination` → mode flips to local → `fitBounds` to city bbox.

4. **Pin dimming** — dimmed pins stay on the map (opacity 0.25), they are NOT removed. The `isShown(item, filters)` predicate is used to compute the `dimmed` prop on each marker. Hiding creates disorienting "disappearance"; dimming preserves spatial context.

5. **AdvancedMarker HTML pins.** `pin-html.ts` exports `pinHTML(item, style, selected, dimmed) → string`. The string is set as `innerHTML` of the `AdvancedMarker`'s content element. Do not use React to render pin interiors — the `@vis.gl/react-google-maps` `AdvancedMarker` accepts a `content` DOM element, not JSX children, for custom HTML.

6. **Scratchpad 3-state** is per-entry, not per-modal. Each `ScratchpadRow` has its own state machine: `'pending' | 'thinking' | 'review'`. The POST to `/api/categorize` happens per-row on submit. Multiple rows can be in different states simultaneously.

7. **Settings in localStorage** — `use-settings.ts` reads/writes `localStorage` directly. No Supabase. No API call. Settings are device-local by design (pin style is a display preference, not account data).

8. **Active trip mode** — `activeTripId` lives in `/map` component state (not URL, not Supabase). It is set by `TripsModal` when user taps a trip row. It shows the amber pill in the sidebar and changes the item card's primary action. It is ephemeral — cleared on page refresh. This is intentional: trip planning mode is a session concept.

9. **Destination string format** is `"City, Country"` (e.g. `"Tokyo, Japan"`). Extracted from Google `address_components` (locality + country). The `CITY_BBOX` keyed on this exact format. Casing matters — normalize to title case on save.

10. **Google Maps API key** must have Maps JavaScript API + Places API enabled. Both scoped to the Vercel deployment domain in production. In local dev, restrict to `localhost`. Key goes in `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (needed in browser bundle; this is acceptable for Maps JS API which uses domain restriction not secrecy).

---

## Task Sequence

### Task 1: Project Scaffold

**Files:** `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `.prettierrc`, `.eslintrc.json`

- [ ] Run `pnpm create next-app@latest . --typescript --app --no-tailwind --no-src-dir`
  - Then move `app/` under `src/app/` and update `tsconfig.json` paths
- [ ] Install deps:
  ```
  pnpm add @vis.gl/react-google-maps @supabase/ssr @supabase/supabase-js
  pnpm add @anthropic-ai/sdk openai @google/generative-ai
  pnpm add -D vitest @vitejs/plugin-react playwright @playwright/test
  ```
- [ ] `next.config.ts` — add `images.remotePatterns` for Google Maps static images; set `reactStrictMode: true`
- [ ] `vitest.config.ts` — `environment: 'node'`, `include: ['tests/**/*.test.ts']`
- [ ] `.env.example` with all required vars:
  ```
  NEXT_PUBLIC_GOOGLE_MAPS_KEY=
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  LLM_PROVIDER=claude
  ANTHROPIC_API_KEY=
  OPENAI_API_KEY=
  GOOGLE_AI_API_KEY=
  ```
- [ ] Commit: `chore: initialize Next.js 15 scaffold with deps`

---

### Task 2: Database Schema

**Files:** `supabase/migrations/20260519000000_initial_schema.sql`

- [ ] Write the migration — exact SQL from spec §5:
  - `items` table with all columns + enum types for `category` and `status`
  - `trips` table
  - `trip_items` join table with `ON DELETE CASCADE` on both FK columns
  - `scratchpad_entries` table
  - RLS: enable on all tables; policy `auth.uid() = user_id` for all operations
  - Indexes: `items(user_id, destination)`, `items(user_id, category)`, `trip_items(trip_id)`
- [ ] Run `supabase start` + `supabase db push` to verify migration applies cleanly
- [ ] Commit: `feat: add initial Supabase schema with RLS`

---

### Task 3: Types and Constants

**Files:** `src/types/index.ts`, `src/lib/google-maps/category-meta.ts`, `src/lib/google-maps/city-bbox.ts`

- [ ] `src/types/index.ts` — export all interfaces from Key Interfaces section above
- [ ] `src/lib/google-maps/category-meta.ts` — export `CATEGORY_META` constant (see Key Interfaces)
- [ ] `src/lib/google-maps/city-bbox.ts` — export `CITY_BBOX: Record<string, { minLat, minLng, maxLat, maxLng, center: [lng, lat] }>` with at least 10 major travel cities (Tokyo, Paris, Rome, Bali, Barcelona, NYC, London, Bangkok, Lisbon, Amsterdam)
- [ ] Write unit test `tests/unit/types.test.ts` — import all types (compile-check only); assert `CATEGORY_META` has 4 keys; assert `CITY_BBOX['Tokyo, Japan']` exists
- [ ] Run `pnpm vitest run tests/unit/types.test.ts` — expect PASS
- [ ] Commit: `feat: add types, category meta, and city bbox constants`

---

### Task 4: Design System

**Files:** `src/app/globals.css`, `src/app/layout.tsx`

- [ ] `src/app/layout.tsx` — import from `next/font/google`:
  ```ts
  const inter       = Inter({ subsets: ['latin'], variable: '--font-inter' })
  const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', style: ['normal', 'italic'] })
  const jetbrains   = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
  ```
  Apply all three variables on `<html>`.
- [ ] `src/app/globals.css` — define CSS custom properties:
  ```css
  :root {
    --paper:   #faf6ec;
    --paper-2: #f3ecd9;
    --paper-3: #ebe2c9;
    --ink:     #2a2418;
    --ink-2:   #4a4030;
    --ink-3:   #7a6d56;
    --font-ui:    var(--font-inter);
    --font-serif: var(--font-serif);
    --font-mono:  var(--font-mono);
    /* density — overridden by useSettings */
    --pad-y: 13px;  /* regular */
  }
  /* oklch category colors as CSS variables */
  --cat-restaurant:    oklch(0.62 0.16 14);
  --cat-place:         oklch(0.62 0.16 36);
  --cat-accommodation: oklch(0.62 0.16 216);
  --cat-activity:      oklch(0.62 0.16 152);
  ```
  Also add: `body { background: var(--paper); color: var(--ink); font-family: var(--font-ui); margin: 0; }`
  And utility classes: `.frosted { background: rgba(250,246,236,.82); backdrop-filter: blur(8px); border-radius: 12px; }`
- [ ] No test needed — verified visually in Task 19
- [ ] Commit: `feat: add design system CSS variables and font imports`

---

### Task 5: Supabase Auth

**Files:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts`, `src/app/(auth)/login/page.tsx`

- [ ] `src/lib/supabase/client.ts` — browser singleton using `createBrowserClient`
- [ ] `src/lib/supabase/server.ts` — server client using `createServerClient` with cookies from `next/headers`
- [ ] `src/middleware.ts` — use `@supabase/ssr` middleware helper; redirect `/` and `/map` to `/login` if no session; redirect `/login` to `/map` if session exists; matcher: `['/', '/map', '/login']`
- [ ] `src/app/(auth)/login/page.tsx` — simple email/password form; client component; calls `supabase.auth.signInWithPassword()` for sign in, `supabase.auth.signUp()` for sign up; redirects to `/map` on success; styled with paper palette (no Tailwind)
- [ ] `src/app/page.tsx` — server component; reads session from server client; redirect to `/map` or `/login`
- [ ] Manual test: `pnpm dev` → visit `localhost:3000` → should redirect to `/login`; create account → should land on `/map` (blank for now)
- [ ] Commit: `feat: add Supabase auth with middleware redirect`

---

### Task 6: AIService + Providers

**Files:** `src/lib/ai/types.ts`, `src/lib/ai/ai-service.ts`, `src/lib/ai/providers/*.ts`, `src/lib/ai/factory.ts`

- [ ] `src/lib/ai/types.ts` — export `LLMProvider` and `CategorizedItem` interfaces (from Key Interfaces)
- [ ] `src/lib/ai/providers/mock-provider.ts`:
  ```ts
  export class MockProvider implements LLMProvider {
    async complete(_prompt: string): Promise<string> {
      return JSON.stringify({ name: 'Test Place', category: 'place', destination: 'Paris, France', notes: null })
    }
  }
  ```
- [ ] `src/lib/ai/providers/claude-provider.ts` — uses `@anthropic-ai/sdk`; `Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`; call `messages.create` with `claude-sonnet-4-6`, `max_tokens: 256`
- [ ] `src/lib/ai/providers/openai-provider.ts` — uses `openai` SDK; `chat.completions.create`; model `gpt-4o-mini`
- [ ] `src/lib/ai/providers/gemini-provider.ts` — uses `@google/generative-ai`; `gemini-2.0-flash`
- [ ] `src/lib/ai/ai-service.ts` — `AIService` class; prompt template lives here:
  ```
  Given this travel note, extract: name, category (place/restaurant/accommodation/activity), destination (city, country), and notes. Return JSON only.
  Note: {{rawText}}
  ```
  Parse response; if JSON.parse fails, return `{ name: rawText, category: null, destination: null, notes: null }`
- [ ] `src/lib/ai/factory.ts` — `createProvider(env: string): LLMProvider` switch on `claude|openai|gemini|mock`
- [ ] Unit test `tests/unit/ai-service.test.ts`:
  - `categorize()` with `MockProvider` returns valid `CategorizedItem`
  - malformed JSON response falls back gracefully
- [ ] Run tests — expect PASS
- [ ] Commit: `feat: add AIService with swappable LLM providers`

---

### Task 7: API Routes

**Files:** `src/app/api/items/route.ts`, `src/app/api/trips/route.ts`, `src/app/api/trip-items/route.ts`, `src/app/api/categorize/route.ts`

All routes: authenticate via server Supabase client (return 401 if no session); return `ApiResponse<T>` shape.

- [ ] `GET /api/items` — query `items` filtered by `user_id`; optional `?destination=` and `?category=` query params; return `ApiResponse<Item[]>`
- [ ] `POST /api/items` — insert one item; `user_id` from session (never from request body); return `ApiResponse<Item>`
- [ ] `GET /api/trips` — list trips for user; return `ApiResponse<Trip[]>`
- [ ] `POST /api/trips` — create trip; return `ApiResponse<Trip>`
- [ ] `POST /api/trip-items` — body: `{ trip_id, item_id }`; insert row; also set `items.status = 'planned'`; return `ApiResponse<void>`
- [ ] `DELETE /api/trip-items` — body: `{ trip_id, item_id }`; delete row; return `ApiResponse<void>`
- [ ] `POST /api/categorize` — body: `{ raw_text, entry_id }`; call `AIService.categorize(raw_text)`; return `ApiResponse<CategorizedItem>`; does NOT write to DB (client does the final save)
- [ ] Integration test `tests/integration/items-api.test.ts` — uses local Supabase + service role key; POST then GET; verify RLS blocks cross-user reads
- [ ] Integration test `tests/integration/categorize-api.test.ts` — set `LLM_PROVIDER=mock`; POST raw text; expect valid `CategorizedItem`
- [ ] Run `pnpm vitest run tests/integration/` — expect PASS
- [ ] Commit: `feat: add API routes for items, trips, trip-items, categorize`

---

### Task 8: Google Maps Pin + Cluster Helpers

**Files:** `src/lib/google-maps/place-type-map.ts`, `src/lib/google-maps/pin-html.ts`, `src/lib/google-maps/cluster-html.ts`

- [ ] `place-type-map.ts` — export `mapPlaceType(types: string[]): Category | null`:
  ```ts
  const RESTAURANT_TYPES = new Set(['cafe','restaurant','bar','bakery','food','meal_delivery','meal_takeaway'])
  const ACCOMMODATION_TYPES = new Set(['lodging','hotel','motel','campground'])
  const PLACE_TYPES = new Set(['tourist_attraction','museum','park','amusement_park','art_gallery','zoo','natural_feature'])
  const ACTIVITY_TYPES = new Set(['gym','spa','stadium','golf_course','bowling_alley'])
  // iterate types array; return first match or null
  ```
- [ ] `pin-html.ts` — export `pinHTML(item: Item, style: 'teardrop'|'dot'|'ring', selected: boolean, dimmed: boolean): string`
  - Build HTML string using category hue from `CATEGORY_META`
  - SVG category glyphs: fork (restaurant), mountain (place), bed (accommodation), star (activity)
  - Teardrop: `viewBox="-16 -22 32 46"`, path `"M0 -16 C -9 -16 -13 -9 -13 -3 C -13 5 -4 12 0 20 C 4 12 13 5 13 -3 C 13 -9 9 -16 0 -16 Z"`, anchor `[16, 42]`
  - Dot: circle r=11, anchor `[18, 18]`
  - Ring: circle r=12 with category-colored border + center dot, anchor `[18, 18]`
  - Dimmed: `opacity: 0.25`; selected: larger drop shadow
- [ ] `cluster-html.ts` — export `clusterHTML(dest: string, count: number, cats: Category[], dimmed: boolean): string`
  - SVG pie chart slices from category hues; white donut in center; count label; city name below
  - Pie slice math: `a0 = (i/n)*2π - π/2`, `a1 = ((i+1)/n)*2π - π/2`; `M 0 0 L x0 y0 A r r 0 {large} 1 x1 y1 Z`
- [ ] Unit test `tests/unit/pin-html.test.ts`:
  - `mapPlaceType(['cafe', 'food'])` returns `'restaurant'`
  - `mapPlaceType(['point_of_interest'])` returns `null`
  - `pinHTML(item, 'teardrop', false, false)` returns string containing `oklch`
  - `pinHTML(item, 'dot', false, true)` returns string containing `opacity: 0.25`
- [ ] Run tests — expect PASS
- [ ] Commit: `feat: add pin HTML helpers and place type mapping`

---

### Task 9: useSettings and useFilters Hooks

**Files:** `src/hooks/use-settings.ts`, `src/hooks/use-filters.ts`, `src/hooks/use-map-mode.ts`, `src/hooks/use-trip.ts`

- [ ] `use-settings.ts`:
  ```ts
  // Reads/writes localStorage key 'tp-settings'
  // Default: { pinStyle: 'teardrop', density: 'regular', showLegend: true }
  // Returns [settings, updateSetting]
  // Also writes --pad-y CSS var on density change: compact=10px, regular=13px, comfy=18px
  ```
- [ ] `use-filters.ts`:
  ```ts
  interface Filters { q: string; destination: string | null; category: Category | 'all'; status: Status | 'all' }
  // Returns [filters, setFilters] — plain useState wrapper with typed shape
  ```
- [ ] `use-map-mode.ts`:
  ```ts
  // Derives 'world' | 'local' from filters.destination
  // Returns { mode, destination }
  ```
- [ ] `use-trip.ts`:
  ```ts
  // State: activeTripId (string | null)
  // Derived: activeTrip (Trip | null) from trips array
  // Action: toggleItemInTrip(item) → POST or DELETE /api/trip-items
  // Returns: { activeTripId, setActiveTripId, activeTrip, toggleItemInTrip, isInTrip }
  ```
- [ ] No unit tests needed (hooks test by integration in Task 19 visual test)
- [ ] Commit: `feat: add useSettings, useFilters, useMapMode, useTrip hooks`

---

### Task 10: Icon Component + Modal Base

**Files:** `src/components/ui/icon.tsx`, `src/components/ui/modal-base.tsx`, `src/components/ui/fab.tsx`

- [ ] `icon.tsx` — client component; SVG path registry for all icons used in the app:
  `globe`, `pin`, `search`, `sparkle`, `plus`, `suitcase`, `gear`, `fork`, `mountain`, `bed`, `star`, `chevron-down`, `x`, `check`, `layers`, `edit`, `arrow-left`
  Props: `name: string`, `size?: number`, `stroke?: string`, `fill?: string`
- [ ] `modal-base.tsx` — fixed backdrop (`rgba(0,0,0,0.4)`); centered white panel (`max-width: 540px`, `border-radius: 16px`, `background: var(--paper)`); close on backdrop click; trap focus; `children` + `onClose` props
- [ ] `fab.tsx` — 56px circle, `background: var(--ink)`, `color: var(--paper)`; rotates `+` → `×` via CSS transform when `open` prop is true; calls `onClick`
- [ ] Commit: `feat: add Icon, ModalBase, FAB UI primitives`

---

### Task 11: Sidebar

**Files:** `src/components/sidebar/sidebar.tsx`, `destination-chips.tsx`, `category-grid.tsx`, `item-list.tsx`, `item-row.tsx`, `active-trip-pill.tsx`

Refer to `panel.jsx` in design reference for exact layout — adapt to typed React + CSS custom properties.

- [ ] `destination-chips.tsx` — props: `destinations: string[]`, `active: string | null`, `onChange(dest: string | null)`. Renders "All" chip + one per destination. Active = `background: var(--ink); color: var(--paper)`.
- [ ] `category-grid.tsx` — props: `items: Item[]`, `activeDestination: string | null`, `activeCategory: Category | 'all'`, `onToggle(cat: Category)`. Count per category filtered to activeDestination. Active cell: border in category color.
- [ ] `item-row.tsx` — props: `item: Item`, `selected: boolean`, `onClick()`. Shows color dot, name, area/cuisine/price muted, 2-line notes preview, status dot at right edge. Selected: `background: var(--paper-2)`. Row height driven by `--pad-y`.
- [ ] `item-list.tsx` — props: `items: Item[]`, `filters: Filters`, `selected: Item | null`, `onSelect(item: Item)`. Header with count + status dropdown. Virtualize with `overflow-y: auto; max-height: calc(100vh - 380px)`. Empty state: "Nothing saved here yet." + open scratchpad button.
- [ ] `active-trip-pill.tsx` — props: `trip: Trip`, `stopCount: number`, `onDeactivate()`. Amber background (`oklch(0.82 0.12 80)`), suitcase icon, deactivate × button. Hidden when no active trip.
- [ ] `sidebar.tsx` — composes all sub-components. Props: `items`, `filters`, `setFilters`, `destinations`, `selected`, `onSelect`, `onOpenAdd`, `onOpenScratchpad`, `onOpenTrips`, `onOpenSettings`, `trips`, `activeTripId`, `onDeactivateTrip`, `scratchpadCount`, `settings`. Fixed left panel, `width: 380px`, `background: var(--paper)`, `border-right: 1px solid var(--paper-3)`.
- [ ] Commit: `feat: add Sidebar and all sub-components`

---

### Task 12: MapView

**Files:** `src/components/map/map-view.tsx`, `cluster-marker.tsx`, `pin-marker.tsx`, `map-bar.tsx`, `zoom-controls.tsx`, `category-legend.tsx`

- [ ] `map-view.tsx` — `'use client'`. Wrap with `<APIProvider apiKey={...}>`. Use `<Map>` from `@vis.gl/react-google-maps`; initial center `{lat: 25, lng: 10}`, zoom 2, `mapId` for styled map; `disableDefaultUI: true`.
  - When `mode === 'world'`: render `<ClusterMarker>` per destination group; on click → `onZoomTo(dest)`
  - When `mode === 'local'`: call `map.fitBounds(cityBbox)` when destination changes; render `<PinMarker>` per item in destination
  - Pass `mapRef` via `useMap()` hook; expose `zoomIn()` / `zoomOut()` via `window.__tpMap` for zoom controls
- [ ] `cluster-marker.tsx` — `<AdvancedMarker position={center}>` with `content` set to a DOM element whose `innerHTML = clusterHTML(...)`. `useEffect` to update innerHTML when dimmed/count changes.
- [ ] `pin-marker.tsx` — `<AdvancedMarker position={{lat, lng}} zIndex={selected ? 10 : 1}>` with content DOM element set to `pinHTML(item, style, selected, dimmed)`. Click → `onSelect(item)`.
- [ ] `map-bar.tsx` — frosted-glass pill, top-right absolute. World: globe + item count. Local: pin + city + count + "Back to world" button → clears `filters.destination`.
- [ ] `zoom-controls.tsx` — stacked + / − buttons, frosted-glass, bottom-right. Click → `window.__tpMap?.zoomIn()` / `zoomOut()`.
- [ ] `category-legend.tsx` — frosted-glass pill, bottom-left. 4 color dots + labels. Hidden when `showLegend: false`.
- [ ] Commit: `feat: add MapView with world/local modes and custom markers`

---

### Task 13: Item Card

**Files:** `src/components/map/item-card.tsx`

- [ ] Floating card, `position: absolute`, top-left (offset from sidebar), `width: 340px`, slide-in animation (`transform: translateX(-10px)` → `translateX(0)`, `opacity 0 → 1`, 200ms).
- [ ] Header: gradient background using category hue (`oklch(0.62 0.16 {hue})`), photo placeholder, category tag (color dot + label), close button.
- [ ] Body: `Source Serif 4` name (22px), area + destination + price level, hours in `JetBrains Mono` pill if available, notes text.
- [ ] Actions:
  - No active trip: "Add to a trip" button (opens TripsModal) + edit icon + layers icon
  - Active trip: single button — dark "Add to [trip]" → green "✓ Added" — calls `toggleItemInTrip(item)`
- [ ] Props: `item: Item`, `activeTrip: Trip | null`, `inActiveTrip: boolean`, `onClose()`, `onAddToTrip(item)`, `onOpenTrips()`
- [ ] Commit: `feat: add floating ItemCard overlay`

---

### Task 14: Add Menu + AutocompleteAdd Modal

**Files:** `src/components/modals/add-menu.tsx`, `src/components/modals/autocomplete-add.tsx`

- [ ] `add-menu.tsx` — popup rising above FAB when open. Three rows (see spec §7). Each row: icon (amber/green/blue) + title + subtitle. Clicking a row calls the appropriate callback. Clicking outside closes. Uses `position: absolute; bottom: 80px; right: 24px`.
- [ ] `autocomplete-add.tsx` — renders inside `<ModalBase>`:
  1. Large search input, autofocused. Uses `usePlacesAutocomplete` from `@vis.gl/react-google-maps` or native Places Autocomplete widget.
  2. Results list: place name, area, Google type tag (monospace).
  3. On place select: collapses to detail form — 2×2 grid (Google types | mapped category dropdown | status segmented control | destination text) + notes textarea + "Save place" button.
  4. "Save place": POST `/api/items`; on success: call `onSave(item)` (parent adds pin + closes modal).
- [ ] Props: `onClose()`, `onSave(item: Item)`
- [ ] Commit: `feat: add AddMenu and AutocompleteAdd modal`

---

### Task 15: Scratchpad Modal

**Files:** `src/components/modals/scratchpad.tsx`, `src/components/modals/scratchpad-row.tsx`

Refer to `modals.jsx` in design reference for the 3-state row design.

- [ ] `scratchpad-row.tsx` — per-entry state machine:
  - `pending`: shows raw text quote + "Sort it" button
  - `thinking`: animated pulse dots (`●  ●  ●` with CSS keyframe delay), "Claude is reading…" text
  - `review`: 2×2 editable grid (Name input | Category dropdown | Destination input | Notes textarea) + action row: "discard" · "re-run" · "Save place" (primary)
  - On submit: POST `/api/categorize` → set state to `thinking` → response → set state to `review` with pre-filled fields
  - "Save place": POST `/api/items` with confirmed fields; call `onSaved(item, entryId)`
  - "discard": DELETE the scratchpad entry (or just call `onDiscarded(entryId)` if parent manages)
- [ ] `scratchpad.tsx` — renders inside `<ModalBase>`. Compose textarea + "Sort it" button at top; list of `<ScratchpadRow>` entries below. Adding text + submitting appends a new row in `pending` state. Props: `entries: ScratchpadEntry[]`, `onSaved(item, entryId)`, `onDiscarded(entryId)`, `onClose()`
- [ ] Commit: `feat: add Scratchpad modal with 3-state per-entry flow`

---

### Task 16: Trips Modal + Settings Modal

**Files:** `src/components/modals/trips-modal.tsx`, `src/components/modals/settings-modal.tsx`

- [ ] `trips-modal.tsx` — inside `<ModalBase>`. List of trips: name, destination, item count, date range (if set). Tap a row → activate (call `onActivate(trip.id)`) → modal closes. "New trip" row at top: expands inline create form (name + destination inputs + Cancel/Create). Newly created trip is auto-activated.
- [ ] `settings-modal.tsx` — inside `<ModalBase>`. Three settings rows (from spec §10):
  - Pin style: Teardrop · Dot · Ring (segmented control with live pin preview)
  - Density: Compact · Regular · Comfy
  - Show legend: toggle switch
  Each change calls `updateSetting(key, value)` from `useSettings` — updates localStorage and CSS var immediately.
- [ ] Commit: `feat: add TripsModal and SettingsModal`

---

### Task 17: /map Page Composition

**Files:** `src/app/map/page.tsx`

This is the wiring task — compose all components built in Tasks 10–16.

- [ ] `'use client'` component (map requires browser APIs). Fetch items + trips from API on mount (`useEffect` with user session).
- [ ] State: `selected`, `modal: null | 'autocomplete' | 'scratchpad' | 'trips' | 'settings'`, `addMenuOpen`
- [ ] Hooks: `useFilters()`, `useSettings()`, `useMapMode(filters)`, `useTrip(trips)`
- [ ] Layout: `display: flex; height: 100vh; overflow: hidden`. Sidebar left (380px fixed). Map right (fills remaining space).
- [ ] Render modals conditionally based on `modal` state — each inside its own `<ModalBase>`
- [ ] Wire FAB → `setAddMenuOpen(true)`. Wire AddMenu rows → `setModal(...)`. Wire Sidebar sparkle → `setModal('scratchpad')`. Wire Sidebar footer Trips → `setModal('trips')`. Wire brand row gear → `setModal('settings')`.
- [ ] On `commitNewItem(item)`: add to local `items` state; close modal; if item has a known destination, set `filters.destination` to auto-zoom map.
- [ ] Manual test: full walkthrough — login → add place via autocomplete → add via scratchpad → create trip → add item to trip → check legend + zoom controls
- [ ] Commit: `feat: wire /map page with all components and hooks`

---

### Task 18: Unit Tests

**Files:** `tests/unit/place-type-map.test.ts`, `tests/unit/ai-service.test.ts`, `tests/unit/pin-html.test.ts`

- [ ] `place-type-map.test.ts`:
  - `mapPlaceType(['cafe', 'food', 'establishment'])` → `'restaurant'`
  - `mapPlaceType(['lodging'])` → `'accommodation'`
  - `mapPlaceType(['museum', 'tourist_attraction'])` → `'place'`
  - `mapPlaceType(['point_of_interest', 'establishment'])` → `null`
  - `mapPlaceType([])` → `null`
- [ ] `ai-service.test.ts`:
  - Mock provider returns valid JSON → `categorize()` returns `CategorizedItem`
  - Mock provider returns malformed JSON → `categorize()` returns `{ name: rawText, category: null, destination: null, notes: null }`
  - Mock provider throws → `categorize()` re-throws (let API route handle)
- [ ] `pin-html.test.ts`:
  - `pinHTML(item, 'teardrop', false, false)` contains `oklch(0.62 0.16 14)` for restaurant
  - `pinHTML(item, 'dot', false, true)` contains `opacity: 0.25`
  - `pinHTML(item, 'ring', true, false)` contains `drop-shadow`
  - `clusterHTML('Tokyo, Japan', 5, ['restaurant','place'], false)` contains `TOKYO`
- [ ] Run `pnpm vitest run tests/unit/` — all PASS
- [ ] Commit: `test: add unit tests for place type map, AI service, pin HTML`

---

### Task 19: Integration Tests

**Files:** `tests/integration/items-api.test.ts`, `tests/integration/categorize-api.test.ts`

Requires: `supabase start`; set `SUPABASE_SERVICE_ROLE_KEY` for test setup.

- [ ] `items-api.test.ts`:
  - Create test user via service role; sign in → get access token
  - POST `/api/items` with valid item → 200 + item returned
  - GET `/api/items` → returns only that user's items
  - Create second test user → GET `/api/items` → returns empty (RLS working)
- [ ] `categorize-api.test.ts`:
  - Set `process.env.LLM_PROVIDER = 'mock'` before import
  - POST `/api/categorize` with `{ raw_text: 'Nobu Tokyo', entry_id: 'test' }` → `{ data: { name, category, destination, notes }, error: null }`
- [ ] Run `pnpm vitest run tests/integration/` — all PASS
- [ ] Commit: `test: add integration tests for items API and categorize API`

---

### Task 20: E2E Tests + Vercel Deploy

**Files:** `e2e/add-item.spec.ts`, `e2e/scratchpad.spec.ts`, `e2e/trip-planning.spec.ts`

- [ ] `add-item.spec.ts`:
  - Login → click FAB → "Search a place" → type "Nobu Tokyo" → select result → verify category auto-populated → save → verify pin appears on map
- [ ] `scratchpad.spec.ts`:
  - Login → click FAB → "Scratchpad" → type "Nobu is amazing for omakase in Tokyo" → submit → wait for `thinking` → wait for `review` → verify fields pre-filled → save → verify entry removed from list
- [ ] `trip-planning.spec.ts`:
  - Login (with pre-seeded items) → footer "Trips" → create "Tokyo May 2026" → activate → click a pin → "Add to Tokyo May 2026" button visible → click it → button turns green → trip pill shows 1 stop
- [ ] `playwright.config.ts`: `webServer: { command: 'pnpm dev', port: 3000 }`; `use: { baseURL: 'http://localhost:3000' }`
- [ ] Vercel deploy: connect GitHub repo → set all env vars from `.env.example` → deploy → smoke test login + add item
- [ ] Commit: `test: add E2E specs for add item, scratchpad, and trip planning`
- [ ] Final commit: `chore: production deploy to Vercel`

---

## Execution Checklist (for orchestrator)

```
[ ] Task 1:  Scaffold               (no deps)
[ ] Task 2:  DB schema              (no deps)
[ ] Task 3:  Types + constants      (needs Task 2)
[ ] Task 4:  Design system          (no deps)
[ ] Task 5:  Auth                   (needs Task 3, 4)
[ ] Task 6:  AIService              (needs Task 3)
[ ] Task 7:  API routes             (needs Task 5, 6)
[ ] Task 8:  Pin/cluster helpers    (needs Task 3)
[ ] Task 9:  Hooks                  (needs Task 3)
[ ] Task 10: UI primitives          (needs Task 4)
[ ] Task 11: Sidebar                (needs Task 3, 9, 10)
[ ] Task 12: MapView                (needs Task 3, 8, 9, 10)
[ ] Task 13: ItemCard               (needs Task 3, 10)
[ ] Task 14: AddMenu + Autocomplete (needs Task 8, 10)
[ ] Task 15: Scratchpad modal       (needs Task 10)
[ ] Task 16: Trips + Settings modal (needs Task 9, 10)
[ ] Task 17: /map composition       (needs Tasks 11-16)
[ ] Task 18: Unit tests             (needs Tasks 6, 8)
[ ] Task 19: Integration tests      (needs Tasks 5, 7)
[ ] Task 20: E2E + deploy           (needs Task 17)
```
