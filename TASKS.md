# Task Queue

Tasks are processed top-to-bottom. Each task goes through the full agent pipeline.

## Format

```
### [TASK-ID] Task Title
**Status:** pending | in_progress | completed | blocked | failed
**Priority:** high | medium | low
**Agent:** researcher | coder | tester | etc.
**Tags:** [domain] tags matching facts.md
**Depends on:** TASK-ID (if any)

Task description — what needs to be done and why.
```

## Tasks

### [TASK-000] Brainstorm and design TravelPlanner
**Status:** completed
**Priority:** high
**Agent:** orchestrator
**Tags:** [core]

Brainstorming complete. Design spec approved and committed.
Spec: `docs/superpowers/specs/2026-05-19-travel-companion-design.md`

Key decisions:
- Stack: Next.js 15 + TypeScript + Supabase + Vercel + Google Maps API
- UI: Map-first (full-screen map with color-coded pins + side panel)
- Data: Single `items` table with category enum + `google_place_types[]` for auto-classification
- AI: AIService abstraction with swappable LLM providers (LLM_PROVIDER env var)
- Phase 1 scope: global save list, 4 categories, AI scratchpad, basic trip planning, auth

---

### [TASK-001] Apply ClaudeTemplate and initialize project structure
**Status:** completed
**Priority:** high
**Agent:** writer
**Tags:** [core]
**Depends on:** TASK-000

ClaudeTemplate (feat/superpowers-phase0-integration) applied manually to TravelPlanner:
- All template files copied with placeholders replaced
- memory/core.md populated with TravelPlanner architecture
- CONVENTIONS.md filled in for Next.js/TypeScript stack
- Agent definitions, hooks, skills, tools all in place
- .claude/settings.json configured with hooks
- GitHub repo initialized: https://github.com/sharmavipin1608/TravelPlanner

---

### [TASK-002] Adjust agent definitions for Next.js / TypeScript stack
**Status:** completed
**Priority:** medium
**Agent:** writer
**Tags:** [agents] [conventions]
**Depends on:** TASK-001

Review `agents/coder.md`, `agents/tester.md`, and `agents/security.md`. Replace generic/language-agnostic guidance with Next.js/TypeScript specifics:
- Coder: ESLint + Prettier commands, `pnpm` as package manager, Next.js App Router patterns
- Tester: Vitest for unit/integration, Playwright for E2E + visual regression, `supabase start` for integration DB
- Security: Next.js-specific concerns (API route auth, env var handling, Supabase RLS, Google Maps key restrictions)

---

### [TASK-003] Write implementation plan
**Status:** completed
**Priority:** high
**Agent:** orchestrator
**Tags:** [core] [planning]
**Depends on:** TASK-001

Plan approved and committed:
`docs/superpowers/plans/2026-05-19-travel-companion-implementation.md`

20-task lean plan (file map + interfaces + non-obvious decisions + ordered steps). No full component code — coder references spec + design files.

---

### [TASK-004] Project scaffold
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [core] [scaffold]
**Depends on:** TASK-003

Initialize Next.js 15 App Router project with pnpm. Install all deps (`@vis.gl/react-google-maps`, `@supabase/ssr`, AI SDKs, Vitest, Playwright). Configure `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`. Move app/ under src/app/. See plan Task 1.

---

### [TASK-005] Database schema
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [database] [supabase]
**Depends on:** TASK-004

Write and apply `supabase/migrations/20260519000000_initial_schema.sql`. Tables: items (with category + status enums), trips, trip_items (ON DELETE CASCADE), scratchpad_entries. RLS on all tables (auth.uid() = user_id). Indexes on items(user_id, destination), items(user_id, category), trip_items(trip_id). See plan Task 2.

---

### [TASK-006] Types and constants
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [core] [types]
**Depends on:** TASK-005

Create `src/types/index.ts` (Item, Trip, TripItem, ScratchpadEntry, Category, Status). Create `src/lib/google-maps/category-meta.ts` (CATEGORY_META with hue/label/glyph per category). Create `src/lib/google-maps/city-bbox.ts` (CITY_BBOX for 10+ cities). Write compile-check unit test. See plan Task 3.

---

### [TASK-007] Design system
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [ui] [design]
**Depends on:** TASK-004

Configure `src/app/layout.tsx` with Google Font imports (Inter, Source Serif 4, JetBrains Mono) as CSS variables. Write `src/app/globals.css` with all CSS custom properties (paper palette, ink palette, category oklch colors, density --pad-y, frosted utility class). See plan Task 4.

---

### [TASK-008] Supabase auth
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [auth] [supabase]
**Depends on:** TASK-006, TASK-007

Create browser + server Supabase clients. Write `src/middleware.ts` (auth redirect: unauthed → /login, authed → /map). Build `src/app/(auth)/login/page.tsx` (email/password sign in + sign up). Build `src/app/page.tsx` (redirect landing). Manual test: login flow end-to-end. See plan Task 5.

---

### [TASK-009] AIService and providers
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [ai] [llm]
**Depends on:** TASK-006

Create `src/lib/ai/types.ts`, `ai-service.ts`, all 4 providers (mock/claude/openai/gemini), and `factory.ts`. Prompt template lives in AIService, not providers. Malformed JSON falls back gracefully. Unit tests with MockProvider. See plan Task 6.

---

### [TASK-010] API routes
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [api] [supabase]
**Depends on:** TASK-008, TASK-009

Build `/api/items` (GET+POST), `/api/trips` (GET+POST), `/api/trip-items` (POST+DELETE), `/api/categorize` (POST). All routes authenticate via server Supabase client; return ApiResponse<T> shape. POST /api/trip-items also sets items.status='planned'. Integration tests with local Supabase + MockProvider. See plan Task 7.

---

### [TASK-011] Google Maps pin and cluster helpers
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [maps] [ui]
**Depends on:** TASK-006

Create `src/lib/google-maps/place-type-map.ts` (deterministic google_place_types → Category). Create `pin-html.ts` (pinHTML for teardrop/dot/ring with SVG glyphs + dimming). Create `cluster-html.ts` (clusterHTML with SVG pie slices). Unit tests for all three. See plan Task 8.

---

### [TASK-012] Hooks (settings, filters, map mode, trip)
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [ui] [state]
**Depends on:** TASK-006

Create `use-settings.ts` (localStorage, --pad-y CSS var on density change), `use-filters.ts` (typed filter state), `use-map-mode.ts` (derives 'world'|'local' from filters.destination), `use-trip.ts` (activeTripId, toggleItemInTrip via API). See plan Task 9.

---

### [TASK-013] UI primitives (Icon, ModalBase, FAB)
**Status:** completed
**Priority:** high
**Agent:** coder
**Tags:** [ui]
**Depends on:** TASK-007

Build `src/components/ui/icon.tsx` (SVG registry for all icons), `modal-base.tsx` (fixed backdrop + centered panel + focus trap + outside-click close), `fab.tsx` (56px dark circle, rotates + → × via CSS). See plan Task 10.

---

### [TASK-014] Sidebar
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [ui] [sidebar]
**Depends on:** TASK-012, TASK-013

Build all sidebar sub-components: `destination-chips.tsx`, `category-grid.tsx` (2×2 with counts + active border), `item-row.tsx` (color dot, name, meta, notes, status dot, --pad-y driven height), `item-list.tsx` (count header + status dropdown + empty state), `active-trip-pill.tsx` (amber, shown only when trip active). Compose in `sidebar.tsx` (380px fixed left). Reference panel.jsx in design files. See plan Task 11.

---

### [TASK-015] MapView (world/local modes + markers)
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [maps] [ui]
**Depends on:** TASK-011, TASK-012, TASK-013

Build `map-view.tsx` ('use client', APIProvider + Map, world/local mode, fitBounds on destination change). Build `cluster-marker.tsx` (AdvancedMarker with clusterHTML). Build `pin-marker.tsx` (AdvancedMarker with pinHTML, zIndex on selected). Build `map-bar.tsx` (frosted-glass pill, Back to world button). Build `zoom-controls.tsx` (window.__tpMap). Build `category-legend.tsx` (hidden when showLegend false). See plan Task 12.

---

### [TASK-016] Item card overlay
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [ui] [maps]
**Depends on:** TASK-013

Build `src/components/map/item-card.tsx`. Floating 340px card, slide-in animation. Header with category gradient + photo placeholder. Body with Source Serif 4 name, area/destination, JetBrains Mono hours pill, notes. Actions: without active trip (Add to a trip + edit + layers); with active trip (toggle dark→green). See plan Task 13.

---

### [TASK-017] AddMenu + AutocompleteAdd modal
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [ui] [maps] [places]
**Depends on:** TASK-013

Build `add-menu.tsx` (3-row popup above FAB, closes on outside click). Build `autocomplete-add.tsx` (Places Autocomplete search → results list → detail form with 2×2 grid + notes → POST /api/items → onSave callback). See plan Task 14.

---

### [TASK-018] Scratchpad modal
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [ui] [ai] [scratchpad]
**Depends on:** TASK-013

Build `scratchpad-row.tsx` (per-entry state machine: pending→thinking→review; POST /api/categorize on submit; 2×2 editable review grid; save/discard/re-run actions). Build `scratchpad.tsx` (compose textarea + row list inside ModalBase). Reference modals.jsx in design files. See plan Task 15.

---

### [TASK-019] Trips modal + Settings modal
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [ui] [trips]
**Depends on:** TASK-012, TASK-013

Build `trips-modal.tsx` (trip list + inline create form + activate on tap). Build `settings-modal.tsx` (pin style segmented control + density + legend toggle; all changes write to localStorage via useSettings immediately). See plan Task 16.

---

### [TASK-020] /map page composition
**Status:** pending
**Priority:** high
**Agent:** coder
**Tags:** [ui] [core]
**Depends on:** TASK-014, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019

Wire `src/app/map/page.tsx`: fetch items+trips on mount; compose Sidebar + MapView + ItemCard + FAB + AddMenu + all modals. Wire all callbacks (FAB→AddMenu, modal triggers, commitNewItem auto-focuses destination, toggleItemInTrip). Full manual walkthrough. See plan Task 17.

---

### [TASK-021] Unit tests
**Status:** pending
**Priority:** high
**Agent:** tester
**Tags:** [testing]
**Depends on:** TASK-009, TASK-011

Write and run unit tests: place-type-map (5 cases), ai-service (MockProvider happy path + malformed JSON), pin-html (3 styles + dimming + cluster). All must pass with `pnpm vitest run tests/unit/`. See plan Task 18.

---

### [TASK-022] Integration tests
**Status:** pending
**Priority:** high
**Agent:** tester
**Tags:** [testing] [api]
**Depends on:** TASK-010

Write and run integration tests against local Supabase: items API (POST+GET, RLS cross-user block), categorize API (LLM_PROVIDER=mock). All must pass. See plan Task 19.

---

### [TASK-023] E2E tests + Vercel deploy
**Status:** pending
**Priority:** high
**Agent:** tester
**Tags:** [testing] [devops]
**Depends on:** TASK-020, TASK-021, TASK-022

Write Playwright E2E specs (add-item, scratchpad 3-state, trip-planning). Configure playwright.config.ts webServer. Deploy to Vercel: connect GitHub repo, set all env vars, smoke test. See plan Task 20.

