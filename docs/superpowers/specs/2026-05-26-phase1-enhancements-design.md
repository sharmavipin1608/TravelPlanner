# Phase 1 Enhancements — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

---

## Summary

Eight visual and UX improvements to the Wayfare map interface, all decided through visual mockups. No new data models; changes are contained to existing components, two new API routes, and one new modal.

---

## 1. Category Color Consolidation

**Problem:** `category-meta.ts` is the canonical color source but `item-row.tsx` and `category-grid.tsx` define their own local hue maps, so a color change in one file doesn't propagate.

**Change:** Remove local color definitions from `item-row.tsx` and `category-grid.tsx`; import `CATEGORY_META` from `@/lib/google-maps/category-meta` everywhere.

**New hues (Option B — Crimson + Amber):**

| Category | Old | New |
|---|---|---|
| `restaurant` | `oklch(0.62 0.16 14)` | `oklch(0.58 0.20 5)` |
| `place` | `oklch(0.62 0.16 36)` | `oklch(0.65 0.15 45)` |
| `accommodation` | unchanged | `oklch(0.62 0.16 216)` |
| `activity` | unchanged | `oklch(0.62 0.16 152)` |

**Files touched:**
- `src/lib/google-maps/category-meta.ts` — update `restaurant` and `place` entries
- `src/components/sidebar/item-row.tsx` — remove local `CATEGORY_HUE`, import `CATEGORY_META`
- `src/components/sidebar/category-grid.tsx` — remove local `CATEGORY_META`, import shared one
- `src/components/map/item-card.tsx` already imports from the shared file — no change needed

---

## 2. Delete Place

**Decision:** Red-tinted × button always visible at the right of each sidebar row. Clicking shows a confirmation dialog before permanently deleting.

**Behavior:**
- × button: `rgba(220,50,30,.08)` background, `oklch(0.55 0.18 14)` icon — always visible
- Clicking × opens `DeleteConfirmModal` with the item's name, destination, and a red "Delete" button
- On confirm: `DELETE /api/items/:id` → remove item from local state, close modal
- On cancel: close modal, no change

**New API route:** `src/app/api/items/[id]/route.ts`
```
DELETE /api/items/:id
Auth: session cookie (supabase server client)
Response 200: { data: null, error: null }
Response 404: { data: null, error: { code: 'NOT_FOUND', message: '...' } }
```

**New component:** `src/components/modals/delete-confirm-modal.tsx`
- Props: `item: Item`, `onConfirm: () => Promise<void>`, `onClose: () => void`
- Renders via `ModalBase`

**Files touched:**
- `src/app/api/items/[id]/route.ts` — new DELETE handler
- `src/components/modals/delete-confirm-modal.tsx` — new modal
- `src/components/sidebar/item-row.tsx` — add `onDelete` prop + × button
- `src/components/sidebar/item-list.tsx` — thread `onDeleteItem` through
- `src/components/sidebar/sidebar.tsx` — thread `onDeleteItem` through
- `src/app/map/page.tsx` — add delete handler, manage `deleteTarget` state

---

## 3. Contextual Action Button

The right-side action slot in each item row changes meaning based on trip mode. This replaces the current status dot (wishlist/planned/visited indicator). The status dot is intentionally removed — the contextual action is more useful at a glance than the status color.

| State | Button | Color |
|---|---|---|
| No trip active | × (delete) | Red-tinted |
| Trip active, item NOT in trip | + (add) | Green-tinted: `rgba(60,180,100,.12)` / `oklch(0.55 0.16 152)` |
| Trip active, item IN trip | × (remove from trip) | Indigo-tinted: `rgba(80,70,200,.08)` / `oklch(0.55 0.18 280)` |

The delete × opens `DeleteConfirmModal`. The add/remove × just calls `onToggleTrip(item)` immediately (no confirmation).

**Props added to `ItemRow`:**
```ts
activeTripId: string | null
isInTrip: boolean
onDelete: (item: Item) => void
onToggleTrip: (item: Item) => void
```

**Files touched:**
- `src/components/sidebar/item-row.tsx` — replace status dot with contextual button
- `src/components/sidebar/item-list.tsx` — thread new props
- `src/components/sidebar/sidebar.tsx` — thread new props
- `src/app/map/page.tsx` — pass `activeTripId`, `isInTrip`, `onToggleTrip` to Sidebar

---

## 4. Trip Indigo Color

Replace all amber/golden trip accent colors with indigo.

| Token | Old value | New value |
|---|---|---|
| Trip accent | `oklch(0.82 0.12 80)` | `oklch(0.92 0.05 280)` |
| Trip border | `oklch(0.7 0.12 36)` | `oklch(0.55 0.18 280)` |
| Planning badge bg | `oklch(0.92 0.06 36)` | `oklch(0.96 0.04 280)` |
| Planning badge text | `oklch(0.4 0.12 36)` | `oklch(0.40 0.18 280)` |
| Active inset shadow | `oklch(0.7 0.12 36)` | `oklch(0.55 0.18 280)` |

**Files touched:**
- `src/components/sidebar/active-trip-pill.tsx` — background and dot color
- `src/components/modals/trips-modal.tsx` — active trip border, inset shadow, planning badge

---

## 5. Edit Trip Dates

**Decision:** Pencil icon (✏️) always visible next to date display. Clicking it swaps the date pills for inline `<input type="date">` fields with Save / Cancel. Saving calls `PATCH /api/trips/:id`.

**New API route:** `src/app/api/trips/[id]/route.ts`
```
PATCH /api/trips/:id
Body: { start_date?: string | null, end_date?: string | null }
Auth: session cookie
Response 200: { data: Trip, error: null }
```

**UI flow inside `TripsModal`:**
1. Each trip row shows date pills: `📅 10 May 2026 → 18 May 2026` + pencil icon
2. Click pencil → pills replaced by two `<input type="date">` + Save + Cancel
3. Save → PATCH → update `localTrips` state + call `onTripsUpdated`
4. Cancel → revert to pill display

**Files touched:**
- `src/app/api/trips/[id]/route.ts` — new PATCH handler
- `src/components/modals/trips-modal.tsx` — pencil icon, editing state per trip, save handler

---

## 6. Trip Dashboard (Expanded Trip View)

When a trip is the active trip in the modal, expand it to show a richer dashboard below its header row.

**Dashboard contents:**
1. **Category breakdown** — 4 mini count cards in a 2×2 grid (one per category, shows count of items in this trip per category)
2. **SVG donut chart** — pure SVG, no library. Segments by category using `CATEGORY_META` colors. Show total stop count in the center.
3. **Stops list** — scrollable list of items in the trip, each row shows category dot + name + destination

The expanded section appears only for `activeTripId === trip.id` in `TripsModal`. It uses `tripItemIds` (from the parent via new prop) and the full `items` array (new prop) to compute per-category counts and the stops list.

**New props on `TripsModal`:**
```ts
items: Item[]
tripItemIds: Set<string>
```

**Note on `useTrip`:** The hook currently only returns `tripItemCount` (the size), not the `Set<string>` itself. Add `tripItemIds` to its return value so the map page can pass it down.

**Files touched:**
- `src/hooks/use-trip.ts` — add `tripItemIds` to return value
- `src/components/modals/trips-modal.tsx` — expanded dashboard section, SVG donut, stops list
- `src/app/map/page.tsx` — pass `items` and `tripItemIds` to `TripsModal`

---

## 7. Map Pin Trip Indicator

When a trip is active, in-trip pins get an indigo ring + subtle glow. Non-trip pins are dimmed to 25% opacity.

**Implementation:** Add `inTrip: boolean` parameter to `pinHTML()`. When `inTrip=true`, wrap the SVG in an additional `<svg>` ring element (indigo stroke circle, `oklch(0.55 0.18 280)`, with a 20% opacity glow circle behind it). When `inTrip=false` and a trip is active, set `dimmed=true` (already supported).

The trip-active dimming logic lives in `map-view.tsx` / `map-page.tsx`: `dimmed = activeTripId != null && !isInTrip(item)`.

**Files touched:**
- `src/lib/google-maps/pin-html.ts` — add `inTrip` param, render indigo ring when true
- `src/components/map/pin-marker.tsx` — add `inTrip` prop, pass to `pinHTML`
- `src/components/map/map-view.tsx` — pass `inTrip={isInTrip(item)}` and updated `dimmed` logic to PinMarker
- `src/app/map/page.tsx` — pass `isInTrip` and `activeTripId` to MapView

---

## 8. Map Legend — Horizontal Pill

**Current:** `category-legend.tsx` renders a vertical stack (column layout) in a rounded-corner box.

**Change:** Convert to a single horizontal row inside a `border-radius: 20px` pill, with `white-space: nowrap` to prevent wrapping.

```ts
// containerStyle changes:
flexDirection: 'row'    // was: implied column (no flex set)
gap: 14                 // between items
borderRadius: 24        // full pill
padding: '6px 16px'     // wider for horizontal
display: 'flex'
alignItems: 'center'
whiteSpace: 'nowrap'
```

The `rowStyle` becomes the item style — same dot + label, just rendered horizontally.

**Files touched:**
- `src/components/map/category-legend.tsx` — layout changes only

---

## Scope Explicitly Excluded

- No changes to the database schema or Supabase row-level security rules
- No new npm dependencies (donut chart is pure SVG)
- No changes to `scratchpad`, `settings-modal`, `add-menu`, or `autocomplete-add`
- Map legend stays as current rounded pill (no style change beyond layout)
- No changes to `ClusterMarker` for trip indicator (cluster pins are dimmed/not dimmed only; no ring — clusters represent multiple items)

---

## Testing Notes

- Delete: Playwright test should click ×, confirm dialog, verify item disappears from list and doesn't reappear on reload
- Edit dates: click pencil, fill dates, save, reload, confirm dates persist
- Category colors: visual snapshot or check that `.style.background` contains `oklch(0.58` for restaurant dots
- Trip indicator: activate trip, toggle an item in, check PinMarker receives `inTrip=true`
