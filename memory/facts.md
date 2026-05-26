# Facts

# Format: [domain] fact about the project
# Grep usage: grep "\[domain\]" memory/facts.md
#
# Domains in use: auth, database, api, maps, llm, ui, devops, scaffold

[scaffold] Next.js version is 16.x (latest at scaffold time), not 15.x — CLAUDE.md/spec say "15" but 16 was installed; confirm intentional before docs update
[scaffold] pnpm is the package manager; scripts: pnpm lint, pnpm format, pnpm test (vitest), pnpm test:e2e (playwright)
[scaffold] App directory is at src/app/ (not app/ at root); tsconfig @/* alias → ./src/*
[scaffold] public/ is at project root (not src/public/); required by Next.js
[scaffold] vitest environment is jsdom (not node) — needed for React component tests
[scaffold] Font stack: Inter (--font-inter), Source Serif 4 (--font-serif), JetBrains Mono (--font-mono) — set as CSS vars on <html>
[scaffold] .env.local is gitignored; LLM_PROVIDER defaults to 'mock' in local dev
[database] Migration file: supabase/migrations/20260519000000_initial_schema.sql
[database] item_category enum: place, restaurant, accommodation, activity (nullable on items for AI-categorization flow)
[database] item_status enum: wishlist, planned, visited
[database] trip_items has no user_id column; RLS uses EXISTS subquery joining trips table
[database] scratchpad_entries.created_item_id is ON DELETE SET NULL (preserves history when item deleted)
[ui] globals.css owns all design tokens — do not add conflicting CSS variables elsewhere
[ui] z-index layers: modal-backdrop=100, FAB/addmenu=20, itemcard=15, sidebar/map-overlays=10
[ui] --pad-y CSS var controls row density (compact=10px, regular=13px, comfy=18px); written by useSettings hook
[ui] --amber / --amber-2 vars defined for trip pill and triage badge
[ui] .frosted utility class: rgba paper bg + backdrop-filter blur(8px) + paper-3 border

[types] src/types/index.ts exports: Item, Trip, TripItem, ScratchpadEntry, ApiResponse<T>, Category, Status
[types] Category = 'place' | 'restaurant' | 'accommodation' | 'activity' (nullable on Item for pending AI categorization)
[types] ApiResponse<T> shape: { data: T | null, error: { code, message } | null }
[maps] CATEGORY_META keyed by Category; each entry has hue (oklch), label, glyph ('fork'|'mountain'|'bed'|'star')
[maps] CITY_BBOX keyed by "City, Country" string (title case); 12 cities including Tokyo/Paris/Rome/Bali/NYC/London
[maps] CityBbox.center is [lng, lat] order (GeoJSON convention), not [lat, lng]
[ui] Icon component: 'use client'; 18 named icons; props: name, size, stroke, fill, strokeWidth, className
[ui] ModalBase: closes on Escape + outside mousedown; moves focus to first focusable on mount; no full focus trap (callers add if needed)
[ui] Fab: uses tp-fab CSS class; is-open class applied when isOpen=true (CSS rotates + to ×)
[auth] src/lib/supabase/client.ts — createBrowserClient singleton (NEXT_PUBLIC_ anon key, safe with RLS)
[auth] src/lib/supabase/server.ts — async createServerClient per request with cookies() from next/headers
[auth] src/middleware.ts — uses auth.getUser() (not getSession()); matcher covers '/', '/map', '/login' only — add new routes explicitly
[auth] Login page defers createClient() to handleSubmit event to avoid static prerender build failure
[llm] AIService factory: LLM_PROVIDER env var selects 'mock'|'claude'|'openai'|'gemini'; defaults to 'mock'
[llm] All LLM API keys are server-only (no NEXT_PUBLIC_ prefix): ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY
[llm] AIService.categorize() strips markdown fences from LLM output, validates category enum, falls back to { name: rawText, category: null } on parse error
[maps] place-type-map.ts: mapPlaceType(types[]) returns first matching Category from priority-ordered Sets; returns null if no match
[maps] cluster-html.ts: escSVG() helper escapes label before SVG innerHTML injection (XSS fix from security review)
[ui] useSettings: 'tp-settings' localStorage key; applyDensity() writes --pad-y to documentElement; spread-merge with DEFAULTS on load
[ui] useTrip: activates trip + resets tripItemIds Set; toggleItemInTrip calls /api/trip-items POST|DELETE optimistically
[api] GET /api/items supports ?destination= and ?category= query params; GET /api/trips has no params
[api] POST /api/trip-items verifies trip and item ownership (trips.user_id + items.user_id) before insert — defense-in-depth on top of RLS
[api] POST /api/categorize calls AIService.categorize(raw_text) and returns CategorizedItem; does NOT write to DB
[ui] Sidebar: fixed left 380px; DestinationChips + CategoryGrid + ItemList + ActiveTripPill; CategoryGrid toggle is idempotent (re-click resets to 'all')
[ui] MapView: APIProvider + Map from @vis.gl/react-google-maps; world mode = ClusterMarker per dest; local mode = PinMarker per item; uses AdvancedMarker with div+useEffect for innerHTML pins (not JSX children)
[ui] window.__tpMap = { zoomIn, zoomOut } — global handle for ZoomControls; set in useEffect after map loads
[ui] ItemCard: position absolute top:80px left:396px; entrance animation via requestAnimationFrame; active trip toggles button color green
