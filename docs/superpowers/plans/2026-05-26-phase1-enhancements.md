# Phase 1 Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement eight UX improvements: category color fix, delete place, contextual trip action button, indigo trip color, edit trip dates, trip dashboard, map pin trip indicator, and horizontal map legend pill.

**Architecture:** All changes are contained to existing React components and two new Next.js API route files. `CATEGORY_META` in `src/lib/google-maps/category-meta.ts` becomes the single source of truth for category colors — a `color` field is added so consumers don't derive colors from `hue` with hardcoded lightness/chroma. State is wired top-down from `map/page.tsx` through existing prop chains.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase server client (`@/lib/supabase/server`), Vitest (unit), Playwright (E2E). No new npm dependencies.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/google-maps/category-meta.ts` | Modify | Add `color` field, update restaurant/place hues |
| `src/components/sidebar/item-row.tsx` | Modify | Import shared CATEGORY_META, add contextual action button |
| `src/components/sidebar/category-grid.tsx` | Modify | Import shared CATEGORY_META |
| `src/components/map/category-legend.tsx` | Modify | Horizontal pill layout |
| `src/components/map/pin-html.ts` → `src/lib/google-maps/pin-html.ts` | Modify | Use `meta.color`, add `inTrip` ring |
| `src/components/map/pin-marker.tsx` | Modify | Add `inTrip` prop |
| `src/components/map/map-view.tsx` | Modify | Pass `inTrip` + updated dimmed logic |
| `src/components/sidebar/active-trip-pill.tsx` | Modify | Indigo color tokens |
| `src/components/modals/trips-modal.tsx` | Modify | Indigo colors, pencil date edit, trip dashboard |
| `src/hooks/use-trip.ts` | Modify | Expose `tripItemIds` in return value |
| `src/app/api/items/[id]/route.ts` | Create | DELETE handler |
| `src/app/api/trips/[id]/route.ts` | Create | PATCH handler |
| `src/components/modals/delete-confirm-modal.tsx` | Create | Confirmation dialog |
| `src/components/sidebar/item-list.tsx` | Modify | Thread `onDeleteItem`, `activeTripId`, `isInTrip`, `onToggleTrip` |
| `src/components/sidebar/sidebar.tsx` | Modify | Thread same props |
| `src/app/map/page.tsx` | Modify | Wire delete, pass `tripItemIds`/`isInTrip` to MapView and TripsModal |
| `tests/unit/pin-html.test.ts` | Modify | Update expected color strings |
| `tests/unit/category-meta.test.ts` | Create | Verify color fields |
| `e2e/phase1-enhancements.spec.ts` | Create | Delete flow + edit dates E2E |

---

## Task 1: Category color — single source of truth

**Files:**
- Modify: `src/lib/google-maps/category-meta.ts`
- Modify: `src/components/sidebar/item-row.tsx`
- Modify: `src/components/sidebar/category-grid.tsx`
- Modify: `src/lib/google-maps/pin-html.ts`
- Create: `tests/unit/category-meta.test.ts`
- Modify: `tests/unit/pin-html.test.ts`

- [ ] **Step 1: Write failing unit test for new color values**

Create `tests/unit/category-meta.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'

describe('CATEGORY_META color field', () => {
  it('restaurant color is crimson oklch(0.58 0.20 5)', () => {
    expect(CATEGORY_META.restaurant.color).toBe('oklch(0.58 0.20 5)')
  })
  it('place color is amber oklch(0.65 0.15 45)', () => {
    expect(CATEGORY_META.place.color).toBe('oklch(0.65 0.15 45)')
  })
  it('accommodation color unchanged', () => {
    expect(CATEGORY_META.accommodation.color).toBe('oklch(0.62 0.16 216)')
  })
  it('activity color unchanged', () => {
    expect(CATEGORY_META.activity.color).toBe('oklch(0.62 0.16 152)')
  })
  it('all categories have a color field', () => {
    for (const meta of Object.values(CATEGORY_META)) {
      expect(meta.color).toMatch(/^oklch/)
    }
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd /Users/vipin/Projects/TravelPlanner && pnpm test -- tests/unit/category-meta.test.ts
```

Expected: FAIL — `color` property does not exist on `CategoryMeta`.

- [ ] **Step 3: Update `src/lib/google-maps/category-meta.ts`**

```ts
import type { Category } from '@/types'

export type Glyph = 'fork' | 'mountain' | 'bed' | 'star'

export interface CategoryMeta {
  hue: number
  color: string
  label: string
  glyph: Glyph
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  restaurant:    { hue: 5,   color: 'oklch(0.58 0.20 5)',   label: 'Restaurants', glyph: 'fork' },
  place:         { hue: 45,  color: 'oklch(0.65 0.15 45)',  label: 'Places',       glyph: 'mountain' },
  accommodation: { hue: 216, color: 'oklch(0.62 0.16 216)', label: 'Stays',        glyph: 'bed' },
  activity:      { hue: 152, color: 'oklch(0.62 0.16 152)', label: 'Activities',   glyph: 'star' },
}
```

- [ ] **Step 4: Run category-meta test — expect PASS**

```bash
pnpm test -- tests/unit/category-meta.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Update `src/lib/google-maps/pin-html.ts` to use `meta.color`**

The function currently constructs `oklch(0.62 0.16 ${meta.hue})` inline. Replace with `meta.color`. Also extract the filter-building logic to support the `inTrip` flag added in Task 12 — add the param now as optional so the signature is set.

```ts
import type { Item } from '@/types'
import { CATEGORY_META } from './category-meta'

export type PinStyle = 'teardrop' | 'dot' | 'ring'

function glyphSVG(glyph: string): string {
  switch (glyph) {
    case 'fork':
      return `<g stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none">
        <path d="M-3 -4 L-3 4 M-4.2 -4 L-4.2 -1 M-1.8 -4 L-1.8 -1" />
        <path d="M3 -4 Q4 -2 3 0 L3 4" />
      </g>`
    case 'mountain':
      return `<path d="M-5 4 L0 -4 L5 4 Z" fill="#fff" />`
    case 'bed':
      return `<g stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none">
        <path d="M-4 2 L-4 -2 L4 -2 L4 2" />
        <path d="M-4 0 L4 0" />
        <circle cx="-2" cy="-1" r="0.8" fill="#fff" stroke="none" />
      </g>`
    case 'star':
      return `<path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fff" />`
    default:
      return `<circle r="2" fill="#fff" />`
  }
}

function buildFilter(selected: boolean, inTrip: boolean): string {
  const parts: string[] = []
  if (selected) parts.push('drop-shadow(0 4px 8px rgba(0,0,0,0.35))')
  if (inTrip)   parts.push('drop-shadow(0 0 5px oklch(0.55 0.18 280))')
  return parts.length ? `filter: ${parts.join(' ')};` : ''
}

export function pinHTML(
  item: Item,
  style: PinStyle,
  selected: boolean,
  dimmed: boolean,
  inTrip = false,
): string {
  const meta = item.category ? CATEGORY_META[item.category] : { color: 'oklch(0.62 0.16 0)', glyph: 'star' as const }
  const color = meta.color
  const opacity = dimmed ? 'opacity: 0.25;' : ''
  const filterStyle = buildFilter(selected, inTrip)

  if (style === 'dot') {
    return `<div style="${opacity}${filterStyle}">
      <svg viewBox="-18 -18 36 36" width="36" height="36" overflow="visible">
        ${selected ? `<circle r="17" fill="${color}" opacity=".18" />` : ''}
        <circle r="11" fill="${color}" stroke="#fff" stroke-width="2.2" />
        <g transform="translate(0 0)">${glyphSVG(meta.glyph)}</g>
      </svg>
    </div>`
  }

  if (style === 'ring') {
    return `<div style="${opacity}${filterStyle}">
      <svg viewBox="-18 -18 36 36" width="36" height="36" overflow="visible">
        ${selected ? `<circle r="19" fill="none" stroke="${color}" stroke-width="1" opacity=".6" />` : ''}
        <circle r="12" fill="#fff" stroke="${color}" stroke-width="3" />
        <circle r="5" fill="${color}" />
      </svg>
    </div>`
  }

  // teardrop (default) — anchor point at bottom (0, 20)
  return `<div style="${opacity}${filterStyle}">
    <svg viewBox="-16 -22 32 46" width="32" height="46" overflow="visible">
      ${selected ? '<ellipse cx="0" cy="20" rx="9" ry="3" fill="rgba(0,0,0,.22)" />' : ''}
      <path d="M0 -16 C -9 -16 -13 -9 -13 -3 C -13 5 -4 12 0 20 C 4 12 13 5 13 -3 C 13 -9 9 -16 0 -16 Z"
            fill="${color}" stroke="#fff" stroke-width="1.6" />
      <g transform="translate(0 -4)">${glyphSVG(meta.glyph)}</g>
    </svg>
  </div>`
}
```

- [ ] **Step 6: Update `tests/unit/pin-html.test.ts` — fix expected color strings**

Replace the existing `pinHTML` describe block (the `it('teardrop contains oklch color for restaurant'` test) with updated expected values, and add an `inTrip` test:

```ts
describe('pinHTML', () => {
  it('teardrop contains new crimson color for restaurant', () => {
    const html = pinHTML(mockItem, 'teardrop', false, false)
    expect(html).toContain('oklch(0.58 0.20 5)')
  })
  it('dimmed pin has opacity 0.25', () => {
    const html = pinHTML(mockItem, 'dot', false, true)
    expect(html).toContain('opacity: 0.25')
  })
  it('selected pin has drop-shadow', () => {
    const html = pinHTML(mockItem, 'ring', true, false)
    expect(html).toContain('drop-shadow')
  })
  it('inTrip pin has indigo drop-shadow', () => {
    const html = pinHTML(mockItem, 'teardrop', false, false, true)
    expect(html).toContain('oklch(0.55 0.18 280)')
  })
  it('null category pin does not throw', () => {
    const nullCatItem = { ...mockItem, category: null }
    expect(() => pinHTML(nullCatItem as Item, 'teardrop', false, false)).not.toThrow()
  })
})
```

- [ ] **Step 7: Run all unit tests — expect PASS**

```bash
pnpm test -- tests/unit/pin-html.test.ts tests/unit/category-meta.test.ts
```

Expected: all pass.

- [ ] **Step 8: Refactor `src/components/sidebar/item-row.tsx` to use shared CATEGORY_META**

Remove the local `CATEGORY_HUE` and `STATUS_COLOR` constants and import `CATEGORY_META`:

```tsx
'use client'

import type { Item, Category } from '@/types'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'

interface ItemRowProps {
  item: Item
  selected: boolean
  onClick: () => void
}

export function ItemRow({ item, selected, onClick }: ItemRowProps) {
  const meta = item.category ? CATEGORY_META[item.category] : null
  const categoryColor = meta?.color ?? 'oklch(0.62 0.16 0)'

  return (
    <div
      role="button"
      data-testid="item-row"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: 'var(--pad-y) 16px',
        cursor: 'pointer',
        background: selected ? 'var(--paper-2)' : 'transparent',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: categoryColor,
          flexShrink: 0,
          marginTop: '4px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--ink-3)',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.destination ?? 'Unknown'}
        </div>
        {item.notes && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--ink-2)',
              marginTop: '2px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.notes}
          </div>
        )}
      </div>
    </div>
  )
}
```

Note: the status dot on the right is removed — it will be replaced by the contextual action button in Task 8.

- [ ] **Step 9: Refactor `src/components/sidebar/category-grid.tsx` to use shared CATEGORY_META**

Remove the local `CATEGORY_META` constant and import from the shared module:

```tsx
'use client'

import type { Item, Category } from '@/types'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'

const CATEGORY_ORDER: Category[] = ['restaurant', 'place', 'accommodation', 'activity']

interface CategoryGridProps {
  items: Item[]
  activeDestination: string | null
  activeCategory: Category | 'all'
  onToggle: (c: Category) => void
}

export function CategoryGrid({
  items,
  activeDestination,
  activeCategory,
  onToggle,
}: CategoryGridProps) {
  const filteredItems = activeDestination
    ? items.filter((item) => item.destination === activeDestination)
    : items

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        padding: '0 14px 10px',
      }}
    >
      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat]
        const count = filteredItems.filter((item) => item.category === cat).length
        const isActive = activeCategory === cat

        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: isActive ? `oklch(0.96 0.03 ${meta.hue})` : 'var(--paper-2)',
              cursor: 'pointer',
              border: isActive ? `1.5px solid ${meta.color}` : '1.5px solid transparent',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: meta.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--ink-2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.label}
            </span>
            {count > 0 && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isActive ? meta.color : 'var(--ink-3)',
                  flexShrink: 0,
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 10: Build check**

```bash
pnpm build 2>&1 | tail -20
```

Expected: no TypeScript errors. Fix any type errors before continuing.

- [ ] **Step 11: Commit**

```bash
git add src/lib/google-maps/category-meta.ts src/lib/google-maps/pin-html.ts \
        src/components/sidebar/item-row.tsx src/components/sidebar/category-grid.tsx \
        tests/unit/category-meta.test.ts tests/unit/pin-html.test.ts
git commit -m "refactor: single source category colors, crimson/amber hues, inTrip filter param"
```

---

## Task 2: Map legend horizontal pill

**Files:**
- Modify: `src/components/map/category-legend.tsx`

- [ ] **Step 1: Replace vertical stack with horizontal pill in `src/components/map/category-legend.tsx`**

```tsx
import { CATEGORY_META } from '@/lib/google-maps/category-meta'
import type { Category } from '@/types'

interface CategoryLegendProps {
  show: boolean
}

const CATEGORIES: Category[] = ['place', 'restaurant', 'accommodation', 'activity']

export function CategoryLegend({ show }: CategoryLegendProps) {
  if (!show) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 396,
        zIndex: 10,
        padding: '6px 16px',
        background: 'rgba(250,246,236,.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        whiteSpace: 'nowrap',
      }}
    >
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat]
        return (
          <div
            key={cat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: meta.color,
                flexShrink: 0,
              }}
            />
            <span>{meta.label}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/map/category-legend.tsx
git commit -m "feat: map legend horizontal pill layout"
```

---

## Task 3: Trip indigo color tokens

**Files:**
- Modify: `src/components/sidebar/active-trip-pill.tsx`
- Modify: `src/components/modals/trips-modal.tsx` (color values only)

- [ ] **Step 1: Update `src/components/sidebar/active-trip-pill.tsx`**

Change `oklch(0.82 0.12 80)` (amber) to `oklch(0.92 0.05 280)` (indigo tint):

```tsx
'use client'

import type { Trip } from '@/types'
import { Icon } from '@/components/ui/icon'

interface ActiveTripPillProps {
  trip: Trip
  stopCount: number
  onDeactivate: () => void
}

export function ActiveTripPill({ trip, stopCount, onDeactivate }: ActiveTripPillProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '8px 16px',
        background: 'oklch(0.92 0.05 280)',
        border: '1px solid oklch(0.55 0.18 280)',
        borderRadius: '24px',
        padding: '8px 12px',
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'oklch(0.55 0.18 280)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ink)',
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {trip.name}
      </span>
      <span style={{ fontSize: '12px', color: 'oklch(0.40 0.18 280)', flexShrink: 0 }}>
        {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
      </span>
      <button
        onClick={onDeactivate}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--ink-2)',
          flexShrink: 0,
        }}
        aria-label="Deactivate trip"
      >
        <Icon name="x" size={14} stroke="var(--ink-2)" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update amber color values in `src/components/modals/trips-modal.tsx`**

Find every amber color reference and replace with indigo equivalents. The changes are:

| Find | Replace |
|---|---|
| `'.5px solid oklch(0.7 0.12 36)'` | `'.5px solid oklch(0.55 0.18 280)'` |
| `'0 0 0 1px oklch(0.7 0.12 36) inset'` | `'0 0 0 1px oklch(0.55 0.18 280) inset'` |
| `background: 'oklch(0.92 0.06 36)'` | `background: 'oklch(0.96 0.04 280)'` |
| `color: 'oklch(0.4 0.12 36)'` | `color: 'oklch(0.40 0.18 280)'` |

The active trip row `isActive` button styles in `trips-modal.tsx` — locate the `isActive` conditional inside the `localTrips.map` block and replace:

```tsx
border: isActive
  ? '.5px solid oklch(0.55 0.18 280)'
  : '.5px solid var(--line, rgba(60,50,30,.10))',
boxShadow: isActive ? '0 0 0 1px oklch(0.55 0.18 280) inset' : 'none',
```

And the "planning" badge:

```tsx
<span
  style={{
    fontSize: 10.5,
    padding: '3px 8px',
    borderRadius: 999,
    background: 'oklch(0.96 0.04 280)',
    color: 'oklch(0.40 0.18 280)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }}
>
  planning
</span>
```

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/active-trip-pill.tsx src/components/modals/trips-modal.tsx
git commit -m "feat: trip indigo color tokens replace amber"
```

---

## Task 4: Expose `tripItemIds` from `useTrip`

**Files:**
- Modify: `src/hooks/use-trip.ts`

- [ ] **Step 1: Add `tripItemIds` to the return value of `useTrip`**

```ts
'use client'

import { useState, useCallback } from 'react'
import type { Item, Trip } from '@/types'

export function useTrip(trips: Trip[]) {
  const [activeTripId, setActiveTripId] = useState<string | null>(null)

  const activeTrip = trips.find((t) => t.id === activeTripId) ?? null

  const [tripItemIds, setTripItemIds] = useState<Set<string>>(new Set())

  const isInTrip = useCallback(
    (item: Item) => tripItemIds.has(item.id),
    [tripItemIds]
  )

  const toggleItemInTrip = useCallback(
    async (item: Item): Promise<{ success: boolean; nowInTrip: boolean }> => {
      if (!activeTripId) return { success: false, nowInTrip: false }
      const inTrip = tripItemIds.has(item.id)
      const method = inTrip ? 'DELETE' : 'POST'

      try {
        const res = await fetch('/api/trip-items', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: activeTripId, item_id: item.id }),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({})) as { error?: { message?: string } }
          console.error('trip-items error:', json.error?.message ?? res.status)
          return { success: false, nowInTrip: inTrip }
        }

        setTripItemIds((prev) => {
          const next = new Set(prev)
          inTrip ? next.delete(item.id) : next.add(item.id)
          return next
        })
        return { success: true, nowInTrip: !inTrip }
      } catch {
        return { success: false, nowInTrip: inTrip }
      }
    },
    [activeTripId, tripItemIds]
  )

  const activateTrip = useCallback((id: string | null) => {
    setActiveTripId(id)
    setTripItemIds(new Set())
    if (id) {
      fetch(`/api/trip-items?trip_id=${id}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data) setTripItemIds(new Set(json.data as string[]))
        })
        .catch(() => {})
    }
  }, [])

  return {
    activeTripId,
    activeTrip,
    isInTrip,
    toggleItemInTrip,
    activateTrip,
    tripItemIds,           // ← newly exposed
    tripItemCount: tripItemIds.size,
  }
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Expected: no errors (no consumers reference `tripItemIds` yet so nothing breaks).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-trip.ts
git commit -m "feat: expose tripItemIds from useTrip hook"
```

---

## Task 5: DELETE /api/items/[id]

**Files:**
- Create: `src/app/api/items/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/items/[id]/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<null>,
        { status: 401 }
      )
    }

    const { error, count } = await supabase
      .from('items')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    if (count === 0) {
      return Response.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Item not found' } } satisfies ApiResponse<null>,
        { status: 404 }
      )
    }

    return Response.json({ data: null, error: null } satisfies ApiResponse<null>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Build check (verifies TypeScript + Next.js route shape)**

```bash
pnpm build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/items/[id]/route.ts
git commit -m "feat: DELETE /api/items/[id] route"
```

---

## Task 6: PATCH /api/trips/[id]

**Files:**
- Create: `src/app/api/trips/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/trips/[id]/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Trip, ApiResponse } from '@/types'

interface PatchBody {
  start_date?: string | null
  end_date?: string | null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<Trip>,
        { status: 401 }
      )
    }

    const body = (await req.json()) as PatchBody
    const update: Partial<Trip> = {}
    if ('start_date' in body) update.start_date = body.start_date ?? null
    if ('end_date' in body)   update.end_date   = body.end_date   ?? null

    if (Object.keys(update).length === 0) {
      return Response.json(
        { data: null, error: { code: 'bad_request', message: 'No fields to update' } } satisfies ApiResponse<Trip>,
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('trips')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<Trip>,
        { status: 500 }
      )
    }

    if (!data) {
      return Response.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Trip not found' } } satisfies ApiResponse<Trip>,
        { status: 404 }
      )
    }

    return Response.json({ data: data as Trip, error: null } satisfies ApiResponse<Trip>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<Trip>,
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/route.ts
git commit -m "feat: PATCH /api/trips/[id] route for date editing"
```

---

## Task 7: DeleteConfirmModal component

**Files:**
- Create: `src/components/modals/delete-confirm-modal.tsx`

- [ ] **Step 1: Create `src/components/modals/delete-confirm-modal.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ModalBase } from '@/components/ui/modal-base'
import type { Item } from '@/types'

interface DeleteConfirmModalProps {
  item: Item
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function DeleteConfirmModal({ item, onConfirm, onClose }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={360}>
      <div style={{ padding: '24px 20px 20px' }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(220,50,30,.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 5h12M8 5V3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V5M7 8v5M11 8v5M4 5l.8 9.2a1 1 0 0 0 1 .8h6.4a1 1 0 0 0 1-.8L14 5"
              stroke="oklch(0.55 0.18 14)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 6,
          }}
        >
          Delete this place?
        </div>

        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
          <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{item.name}</strong>
          {item.destination ? ` · ${item.destination.split(',')[0]}` : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20 }}>
          This will permanently remove it from your atlas.
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: '8px 16px',
              background: 'none',
              color: 'var(--ink-2)',
              border: '1px solid var(--paper-3)',
              borderRadius: 8,
              fontSize: 13,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            data-testid="confirm-delete-btn"
            style={{
              padding: '8px 16px',
              background: 'oklch(0.55 0.18 14)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </ModalBase>
  )
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/delete-confirm-modal.tsx
git commit -m "feat: DeleteConfirmModal component"
```

---

## Task 8: ItemRow contextual action button

**Files:**
- Modify: `src/components/sidebar/item-row.tsx`

- [ ] **Step 1: Add contextual action button to `ItemRow`**

The right slot shows: × (delete, red) when no trip active; + (add, green) when trip active and not in trip; × (remove, indigo) when trip active and in trip. The status dot is removed.

```tsx
'use client'

import type { Item } from '@/types'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'

interface ItemRowProps {
  item: Item
  selected: boolean
  onClick: () => void
  activeTripId: string | null
  isInTrip: boolean
  onDelete: (item: Item) => void
  onToggleTrip: (item: Item) => void
}

export function ItemRow({
  item,
  selected,
  onClick,
  activeTripId,
  isInTrip,
  onDelete,
  onToggleTrip,
}: ItemRowProps) {
  const meta = item.category ? CATEGORY_META[item.category] : null
  const categoryColor = meta?.color ?? 'oklch(0.62 0.16 0)'

  function actionButton() {
    if (!activeTripId) {
      return (
        <button
          data-testid="delete-item-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(item) }}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(220,50,30,.08)',
            color: 'oklch(0.55 0.18 14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
          }}
          aria-label={`Delete ${item.name}`}
        >
          ×
        </button>
      )
    }

    if (!isInTrip) {
      return (
        <button
          data-testid="add-to-trip-btn"
          onClick={(e) => { e.stopPropagation(); onToggleTrip(item) }}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(60,180,100,.12)',
            color: 'oklch(0.55 0.16 152)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1,
          }}
          aria-label={`Add ${item.name} to trip`}
        >
          +
        </button>
      )
    }

    return (
      <button
        data-testid="remove-from-trip-btn"
        onClick={(e) => { e.stopPropagation(); onToggleTrip(item) }}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(80,70,200,.08)',
          color: 'oklch(0.55 0.18 280)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
        aria-label={`Remove ${item.name} from trip`}
      >
        ×
      </button>
    )
  }

  return (
    <div
      role="button"
      data-testid="item-row"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: 'var(--pad-y) 16px',
        cursor: 'pointer',
        background: selected ? 'var(--paper-2)' : 'transparent',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: categoryColor,
          flexShrink: 0,
          marginTop: '4px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--ink-3)',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.destination ?? 'Unknown'}
        </div>
        {item.notes && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--ink-2)',
              marginTop: '2px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.notes}
          </div>
        )}
      </div>
      <div style={{ marginTop: '2px' }}>
        {actionButton()}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -15
```

Expected: TypeScript errors in `item-list.tsx` (missing new props) — that's expected and will be fixed in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/item-row.tsx
git commit -m "feat: ItemRow contextual action button (delete / add / remove trip)"
```

---

## Task 9: Thread props — ItemList, Sidebar, map/page.tsx + E2E delete test

**Files:**
- Modify: `src/components/sidebar/item-list.tsx`
- Modify: `src/components/sidebar/sidebar.tsx`
- Modify: `src/app/map/page.tsx`
- Create: `e2e/phase1-enhancements.spec.ts`

- [ ] **Step 1: Write failing E2E test for delete flow**

Create `e2e/phase1-enhancements.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

async function goToMap(page: Parameters<typeof test>[1]) {
  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
}

test('delete: clicking × opens confirm dialog and deletes item', async ({ page }) => {
  await goToMap(page)

  // Add a throwaway item first
  const name = `Delete Me ${Date.now()}`
  await page.getByTestId('fab').click()
  await page.waitForTimeout(300)
  await page.getByText('Add manually').click()
  await page.waitForTimeout(300)
  await page.locator('input[placeholder="e.g. Ahiru Store"]').fill(name)
  await page.getByLabel('Category').selectOption('place')
  await page.locator('input[placeholder="e.g. Paris, France"]').fill('Tokyo, Japan')
  await page.getByRole('button', { name: /save place/i }).click()
  await page.waitForTimeout(1000)

  // Item row should be visible
  await expect(page.getByText(name)).toBeVisible()

  // Click the delete × button on that row
  const row = page.locator('[data-testid="item-row"]').filter({ hasText: name })
  await row.locator('[data-testid="delete-item-btn"]').click()
  await page.waitForTimeout(300)

  // Confirmation dialog should appear
  await expect(page.getByText('Delete this place?')).toBeVisible()
  await expect(page.getByText(name)).toBeVisible()

  // Confirm delete
  await page.getByTestId('confirm-delete-btn').click()
  await page.waitForTimeout(1000)

  // Item should be gone
  await expect(page.getByText(name)).not.toBeVisible()

  // Reload to confirm server-side deletion
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await expect(page.getByText(name)).not.toBeVisible()
})
```

- [ ] **Step 2: Update `src/components/sidebar/item-list.tsx`**

```tsx
'use client'

import type { Item, Status } from '@/types'
import type { Filters } from '@/hooks/use-filters'
import { ItemRow } from './item-row'

interface ItemListProps {
  items: Item[]
  filters: Filters
  selected: Item | null
  onSelect: (item: Item) => void
  onOpenScratchpad: () => void
  onStatusChange?: (status: Status | 'all') => void
  activeTripId: string | null
  isInTrip: (item: Item) => boolean
  onDeleteItem: (item: Item) => void
  onToggleTrip: (item: Item) => void
}

const STATUS_OPTIONS: Array<{ value: Status | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'planned', label: 'Planned' },
  { value: 'visited', label: 'Visited' },
]

function applyFilters(items: Item[], filters: Filters): Item[] {
  return items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false
    if (filters.status !== 'all' && item.status !== filters.status) return false
    if (filters.destination !== null && item.destination !== filters.destination) return false
    if (filters.q) {
      const q = filters.q.toLowerCase()
      const nameMatch = item.name.toLowerCase().includes(q)
      const notesMatch = item.notes?.toLowerCase().includes(q) ?? false
      if (!nameMatch && !notesMatch) return false
    }
    return true
  })
}

export function ItemList({
  items,
  filters,
  selected,
  onSelect,
  onOpenScratchpad,
  onStatusChange,
  activeTripId,
  isInTrip,
  onDeleteItem,
  onToggleTrip,
}: ItemListProps) {
  const filtered = applyFilters(items, filters)

  const labelText =
    filters.category !== 'all'
      ? filters.category === 'accommodation'
        ? 'stays'
        : filters.category === 'activity'
        ? 'activities'
        : `${filters.category}s`
      : 'places'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
          {filtered.length} {labelText}
        </span>
        <select
          value={filters.status}
          onChange={(e) => onStatusChange?.(e.target.value as Status | 'all')}
          style={{
            fontSize: '12px',
            color: 'var(--ink-2)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--ink-3)',
              fontSize: '14px',
            }}
          >
            <div style={{ marginBottom: '12px' }}>Nothing saved here yet.</div>
            <button
              onClick={onOpenScratchpad}
              style={{
                fontSize: '13px',
                color: 'var(--ink-2)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Add via scratchpad →
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onClick={() => onSelect(item)}
              activeTripId={activeTripId}
              isInTrip={isInTrip(item)}
              onDelete={onDeleteItem}
              onToggleTrip={onToggleTrip}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/components/sidebar/sidebar.tsx`**

Add the four new props to `SidebarProps` and thread them to `ItemList`:

```tsx
export interface SidebarProps {
  items: Item[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  destinations: string[]
  selected: Item | null
  onSelect: (item: Item) => void
  onOpenAdd: () => void
  onOpenScratchpad: () => void
  onOpenTrips: () => void
  onOpenSettings: () => void
  trips: Trip[]
  activeTripId: string | null
  tripItemCount: number
  onDeactivateTrip: () => void
  scratchpadCount: number
  isInTrip: (item: Item) => boolean
  onDeleteItem: (item: Item) => void
  onToggleTrip: (item: Item) => void
}
```

In the `Sidebar` function body, add the new props to the destructuring:

```tsx
export function Sidebar({
  items, filters, setFilters, destinations, selected, onSelect,
  onOpenAdd, onOpenScratchpad, onOpenTrips, onOpenSettings,
  trips, activeTripId, tripItemCount, onDeactivateTrip, scratchpadCount,
  isInTrip, onDeleteItem, onToggleTrip,
}: SidebarProps) {
```

Pass them to `ItemList` at the bottom of the component (replace the existing `<ItemList>` call):

```tsx
<ItemList
  items={items}
  filters={filters}
  selected={selected}
  onSelect={onSelect}
  onOpenScratchpad={onOpenScratchpad}
  onStatusChange={handleStatusChange}
  activeTripId={activeTripId}
  isInTrip={isInTrip}
  onDeleteItem={onDeleteItem}
  onToggleTrip={onToggleTrip}
/>
```

- [ ] **Step 4: Wire delete in `src/app/map/page.tsx`**

Add `deleteTarget` state, `handleDeleteItem` function, `DeleteConfirmModal`, and pass new props to `Sidebar`. Also pass `isInTrip` to `Sidebar`.

At the top of the component, add the import and state:

```tsx
import { DeleteConfirmModal } from '@/components/modals/delete-confirm-modal'
```

Inside `MapPage`, add state:

```tsx
const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
```

Add the handler after `handleToggleTrip`:

```tsx
async function handleDeleteItem(item: Item) {
  setDeleteTarget(item)
}

async function confirmDelete() {
  if (!deleteTarget) return
  const res = await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' })
  if (res.ok) {
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
    if (selected?.id === deleteTarget.id) setSelected(null)
  }
  setDeleteTarget(null)
}
```

Update the `<Sidebar>` call to include the new props:

```tsx
<Sidebar
  items={items}
  filters={filters}
  setFilters={setFilters}
  destinations={destinations}
  selected={selected}
  onSelect={setSelected}
  onOpenAdd={() => setModal('autocomplete')}
  onOpenScratchpad={() => setModal('scratchpad')}
  onOpenTrips={() => setModal('trips')}
  onOpenSettings={() => setModal('settings')}
  trips={trips}
  activeTripId={activeTripId}
  tripItemCount={tripItemCount}
  onDeactivateTrip={() => activateTrip(null)}
  scratchpadCount={scratchpadEntries.length}
  isInTrip={isInTrip}
  onDeleteItem={handleDeleteItem}
  onToggleTrip={handleToggleTrip}
/>
```

Add the `DeleteConfirmModal` at the bottom of the JSX (before the closing `</div>`):

```tsx
{deleteTarget && (
  <DeleteConfirmModal
    item={deleteTarget}
    onConfirm={confirmDelete}
    onClose={() => setDeleteTarget(null)}
  />
)}
```

- [ ] **Step 5: Build check**

```bash
pnpm build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 6: Run E2E delete test**

```bash
pnpm build && pnpm start &
sleep 5
pnpm exec playwright test e2e/phase1-enhancements.spec.ts --headed=false
```

Expected: delete test passes.

- [ ] **Step 7: Commit**

```bash
git add src/components/sidebar/item-list.tsx src/components/sidebar/sidebar.tsx \
        src/app/map/page.tsx e2e/phase1-enhancements.spec.ts
git commit -m "feat: wire delete flow end-to-end — sidebar action button + confirm modal"
```

---

## Task 10: Edit trip dates in TripsModal

**Files:**
- Modify: `src/components/modals/trips-modal.tsx`

- [ ] **Step 1: Add `editingDatesTripId` state and pencil UI to `TripsModal`**

Add to the existing state declarations at the top of `TripsModal`:

```tsx
const [editingDatesTripId, setEditingDatesTripId] = useState<string | null>(null)
const [editStart, setEditStart] = useState('')
const [editEnd, setEditEnd] = useState('')
```

Add a save-dates handler after `handleCreate`:

```tsx
async function handleSaveDates(tripId: string) {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_date: editStart || null,
      end_date: editEnd || null,
    }),
  })
  if (!res.ok) return
  const json = await res.json() as { data: Trip | null }
  if (!json.data) return
  const updated = localTrips.map((t) => t.id === tripId ? json.data! : t)
  setLocalTrips(updated)
  onTripsUpdated(updated)
  setEditingDatesTripId(null)
}
```

In the `localTrips.map` block, replace the trip row JSX. Add the date row below the trip name/meta, and a pencil icon. When `editingDatesTripId === trip.id` swap to the input form. The complete button JSX for a trip row is now:

```tsx
<div key={trip.id} style={{ marginTop: 8 }}>
  <button
    onClick={() => handleRowClick(trip.id)}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '14px 16px 10px',
      background: '#fff',
      border: isActive
        ? '.5px solid oklch(0.55 0.18 280)'
        : '.5px solid var(--line, rgba(60,50,30,.10))',
      boxShadow: isActive ? '0 0 0 1px oklch(0.55 0.18 280) inset' : 'none',
      borderRadius: editingDatesTripId === trip.id ? '10px 10px 0 0' : 10,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'border-color .12s, background .12s',
    }}
  >
    <div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        {trip.name}
      </div>
      {meta && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
          {meta}
        </div>
      )}
    </div>
    <div style={{ color: 'var(--ink-3)', flexShrink: 0, marginLeft: 12 }}>
      {isActive ? (
        <span
          style={{
            fontSize: 10.5,
            padding: '3px 8px',
            borderRadius: 999,
            background: 'oklch(0.96 0.04 280)',
            color: 'oklch(0.40 0.18 280)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          planning
        </span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  </button>

  {/* Date row — below the button */}
  {editingDatesTripId !== trip.id ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 16px 10px',
        background: '#fff',
        border: isActive
          ? '.5px solid oklch(0.55 0.18 280)'
          : '.5px solid var(--line, rgba(60,50,30,.10))',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        boxShadow: isActive ? '0 0 0 1px oklch(0.55 0.18 280) inset' : 'none',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: 1 }}>
        {dateRange ?? <em style={{ fontStyle: 'italic' }}>No dates set</em>}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setEditStart(trip.start_date ?? '')
          setEditEnd(trip.end_date ?? '')
          setEditingDatesTripId(trip.id)
        }}
        aria-label="Edit dates"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          color: 'var(--ink-3)',
          fontSize: 13,
          lineHeight: 1,
        }}
      >
        ✏️
      </button>
    </div>
  ) : (
    <div
      style={{
        padding: '10px 16px 12px',
        background: '#fff',
        border: '.5px solid oklch(0.55 0.18 280)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Start</div>
          <input
            type="date"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>End</div>
          <input
            type="date"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            style={dateInputStyle}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setEditingDatesTripId(null)}
          style={{
            padding: '6px 12px',
            background: 'none',
            color: 'var(--ink-2)',
            border: '1px solid var(--paper-3)',
            borderRadius: 6,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => handleSaveDates(trip.id)}
          style={{
            padding: '6px 12px',
            background: 'oklch(0.55 0.18 280)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )}
</div>
```

Add the `dateInputStyle` constant alongside `inputStyle` at the bottom of the file:

```ts
const dateInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1.5px solid oklch(0.55 0.18 280)',
  borderRadius: 6,
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
}
```

- [ ] **Step 2: Add edit-dates E2E test to `e2e/phase1-enhancements.spec.ts`**

Append this test:

```ts
test('edit dates: pencil opens inputs, save persists on reload', async ({ page }) => {
  await goToMap(page)

  // Open trips modal
  await page.getByTestId('trips-btn').click()
  await page.waitForTimeout(500)

  // If there are no trips, create one first
  const tripCount = await page.locator('button').filter({ hasText: /^[A-Z]/ }).count()
  if (tripCount === 0) {
    await page.getByText('New trip').click()
    await page.locator('input[placeholder*="Trip name"]').fill(`Dates Test ${Date.now()}`)
    await page.getByRole('button', { name: /create trip/i }).click()
    await page.waitForTimeout(500)
  }

  // Click pencil on the first trip
  await page.locator('button[aria-label="Edit dates"]').first().click()
  await page.waitForTimeout(300)

  // Fill in dates
  await page.locator('input[type="date"]').first().fill('2026-06-01')
  await page.locator('input[type="date"]').last().fill('2026-06-10')

  // Save
  await page.getByRole('button', { name: /^save$/i }).click()
  await page.waitForTimeout(500)

  // Date should now show
  await expect(page.getByText(/jun/i)).toBeVisible()

  // Close and reopen to confirm persistence
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.getByTestId('trips-btn').click()
  await page.waitForTimeout(500)
  await expect(page.getByText(/jun/i)).toBeVisible()
})
```

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -15
```

- [ ] **Step 4: Run E2E tests**

```bash
pnpm exec playwright test e2e/phase1-enhancements.spec.ts
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/trips-modal.tsx e2e/phase1-enhancements.spec.ts
git commit -m "feat: edit trip dates via pencil icon inline form"
```

---

## Task 11: Trip dashboard in TripsModal

**Files:**
- Modify: `src/components/modals/trips-modal.tsx`
- Modify: `src/app/map/page.tsx`

- [ ] **Step 1: Add `items` and `tripItemIds` props to `TripsModal`**

Update the `TripsModalProps` interface:

```tsx
interface TripsModalProps {
  trips: Trip[]
  activeTripId: string | null
  onActivate: (tripId: string) => void
  onClose: () => void
  onTripsUpdated: (trips: Trip[]) => void
  items: Item[]
  tripItemIds: Set<string>
}
```

Add `items` and `tripItemIds` to the function destructuring:

```tsx
export function TripsModal({ trips, activeTripId, onActivate, onClose, onTripsUpdated, items, tripItemIds }: TripsModalProps) {
```

Add the `Item` import at the top:

```tsx
import type { Trip, Item, ApiResponse } from '@/types'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'
```

- [ ] **Step 2: Add the SVG donut chart helper and dashboard section inside `TripsModal`**

Add these helper functions inside the file (outside the component):

```tsx
type Category = 'restaurant' | 'place' | 'accommodation' | 'activity'
const CATEGORY_ORDER: Category[] = ['restaurant', 'place', 'accommodation', 'activity']

function DonutChart({ tripItems }: { tripItems: Item[] }) {
  const total = tripItems.length
  if (total === 0) return null

  const r = 28
  const cx = 36
  const circumference = 2 * Math.PI * r

  const counts = CATEGORY_ORDER.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = tripItems.filter((i) => i.category === cat).length
    return acc
  }, {})

  let offset = 0
  const segments = CATEGORY_ORDER
    .filter((cat) => counts[cat] > 0)
    .map((cat) => {
      const fraction = counts[cat] / total
      const dashLen = fraction * circumference
      const dashOffset = -(offset * circumference)
      offset += fraction
      return { cat, dashLen, dashOffset, color: CATEGORY_META[cat].color }
    })

  return (
    <svg width={72} height={72} viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      {segments.map(({ cat, dashLen, dashOffset, color }) => (
        <circle
          key={cat}
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeDasharray={`${dashLen} ${circumference}`}
          strokeDashoffset={dashOffset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cx}px` }}
        />
      ))}
      <text
        x={cx}
        y={cx}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fontWeight={700}
        fill="var(--ink)"
        fontFamily="var(--font-serif)"
      >
        {total}
      </text>
    </svg>
  )
}
```

- [ ] **Step 3: Add the dashboard section inside the trip row expansion**

In the `localTrips.map` block, after the date row JSX (still inside `editingDatesTripId !== trip.id` branch), add a dashboard expansion that only renders when `isActive`:

```tsx
{isActive && (
  <div
    style={{
      background: '#fff',
      border: '.5px solid oklch(0.55 0.18 280)',
      borderTop: 'none',
      borderRadius: '0 0 10px 10px',
      padding: '12px 16px 14px',
    }}
  >
    {(() => {
      const tripItems = items.filter((i) => tripItemIds.has(i.id))
      const counts = CATEGORY_ORDER.reduce<Record<string, number>>((acc, cat) => {
        acc[cat] = tripItems.filter((i) => i.category === cat).length
        return acc
      }, {})

      return (
        <>
          {/* Top: donut + category grid */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <DonutChart tripItems={tripItems} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
                flex: 1,
              }}
            >
              {CATEGORY_ORDER.map((cat) => (
                <div
                  key={cat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 6px',
                    borderRadius: 6,
                    background: 'var(--paper-2)',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: CATEGORY_META[cat].color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 10, color: 'var(--ink-3)' }}>
                    {CATEGORY_META[cat].label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                    {counts[cat]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stops list */}
          {tripItems.length > 0 && (
            <div
              style={{
                borderTop: '1px solid var(--paper-3)',
                paddingTop: 8,
                maxHeight: 140,
                overflowY: 'auto',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                Stops
              </div>
              {tripItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 0',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: item.category ? CATEGORY_META[item.category].color : 'var(--ink-3)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
                    {item.destination?.split(',')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )
    })()}
  </div>
)}
```

**Important:** This expansion sits BELOW the date row. The date row already has `borderRadius: '0 0 10px 10px'`. When `isActive` is true, remove the bottom border-radius from the date row and let the dashboard section close it. Update the date row style to:

```tsx
borderRadius: isActive ? 0 : '0 0 10px 10px',
```

And give the dashboard div `borderRadius: '0 0 10px 10px'`.

- [ ] **Step 4: Pass `items` and `tripItemIds` from `map/page.tsx` to `TripsModal`**

In `src/app/map/page.tsx`, update the `<TripsModal>` JSX:

```tsx
{modal === 'trips' && (
  <TripsModal
    trips={trips}
    activeTripId={activeTripId}
    onActivate={(tripId) => { activateTrip(tripId); setModal(null) }}
    onClose={() => setModal(null)}
    onTripsUpdated={setTrips}
    items={items}
    tripItemIds={tripItemIds}
  />
)}
```

- [ ] **Step 5: Build check**

```bash
pnpm build 2>&1 | tail -15
```

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/trips-modal.tsx src/app/map/page.tsx
git commit -m "feat: trip dashboard — category grid, SVG donut chart, stops list"
```

---

## Task 12: Map pin trip indicator

**Files:**
- Modify: `src/lib/google-maps/pin-html.ts` (already has `inTrip` param from Task 1 — no file change needed)
- Modify: `src/components/map/pin-marker.tsx`

Note: `pin-html.ts` was already updated in Task 1 to accept `inTrip = false` and apply the indigo glow filter. This task only needs to wire the prop into `PinMarker`.

- [ ] **Step 1: Update `src/components/map/pin-marker.tsx` to accept and pass `inTrip`**

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Item } from '@/types'
import type { PinStyle } from '@/lib/google-maps/pin-html'
import { pinHTML } from '@/lib/google-maps/pin-html'

interface PinMarkerProps {
  item: Item
  style: PinStyle
  selected: boolean
  dimmed: boolean
  inTrip: boolean
  onClick: () => void
}

export function PinMarker({ item, style, selected, dimmed, inTrip, onClick }: PinMarkerProps) {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerHTML = pinHTML(item, style, selected, dimmed, inTrip)
    }
  }, [item, style, selected, dimmed, inTrip])

  if (item.lat == null || item.lng == null) return null

  return (
    <AdvancedMarker
      position={{ lat: item.lat, lng: item.lng }}
      zIndex={selected ? 10 : inTrip ? 5 : 1}
      onClick={onClick}
    >
      <div ref={divRef} />
    </AdvancedMarker>
  )
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -15
```

Expected: TypeScript error in `map-view.tsx` — `inTrip` prop missing. That is fixed in Task 13.

- [ ] **Step 3: Commit**

```bash
git add src/components/map/pin-marker.tsx
git commit -m "feat: PinMarker accepts inTrip prop for indigo glow treatment"
```

---

## Task 13: Wire pin indicator in MapView + map/page.tsx

**Files:**
- Modify: `src/components/map/map-view.tsx`
- Modify: `src/app/map/page.tsx`

- [ ] **Step 1: Update `MapViewProps` and `MapInner` in `src/components/map/map-view.tsx`**

Add `activeTripId` and `isInTrip` to `MapViewProps`:

```tsx
interface MapViewProps {
  items: Item[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  settings: Settings
  selected: Item | null
  onSelect: (item: Item) => void
  onZoomTo: (dest: string) => void
  activeTripId: string | null
  isInTrip: (item: Item) => boolean
}
```

In `MapInner`, update the `localItems` `PinMarker` render:

```tsx
{mode === 'local' &&
  localItems.map((item) => {
    const inTrip = isInTrip(item)
    const dimmed = activeTripId != null ? (!inTrip && !isShown(item, filters)) : !isShown(item, filters)
    return (
      <PinMarker
        key={item.id}
        item={item}
        style={settings.pinStyle}
        selected={selected?.id === item.id}
        dimmed={dimmed}
        inTrip={inTrip}
        onClick={() => onSelect(item)}
      />
    )
  })}
```

Also spread both new props through `MapInner` (it already forwards `...props` from `MapView`):

```tsx
function MapInner({
  items, filters, setFilters, settings, selected, onSelect, onZoomTo, activeTripId, isInTrip,
}: MapViewProps) {
```

- [ ] **Step 2: Pass `activeTripId` and `isInTrip` to `MapView` in `src/app/map/page.tsx`**

```tsx
<MapView
  items={items}
  filters={filters}
  setFilters={setFilters}
  settings={settings}
  selected={selected}
  onSelect={setSelected}
  onZoomTo={(dest) => setFilters((f) => ({ ...f, destination: dest }))}
  activeTripId={activeTripId}
  isInTrip={isInTrip}
/>
```

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Run all unit tests**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 5: Run full E2E suite**

```bash
pnpm build && pnpm start &
sleep 5
pnpm exec playwright test e2e/functional.spec.ts e2e/trip-persistence.spec.ts e2e/cluster-marker-svg.spec.ts e2e/phase1-enhancements.spec.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/map/map-view.tsx src/app/map/page.tsx
git commit -m "feat: wire map pin trip indicator — indigo glow on in-trip pins, dimming for non-trip"
```

---

## Self-Review Checklist

After writing this plan, checking it against the spec:

| Spec requirement | Task |
|---|---|
| Category colors single source of truth | Task 1 |
| Restaurant → crimson `oklch(0.58 0.20 5)` | Task 1 |
| Place → amber `oklch(0.65 0.15 45)` | Task 1 |
| Map legend horizontal pill | Task 2 |
| Indigo trip pill + trips modal | Task 3 |
| `tripItemIds` exposed from `useTrip` | Task 4 |
| DELETE /api/items/[id] | Task 5 |
| PATCH /api/trips/[id] | Task 6 |
| DeleteConfirmModal | Task 7 |
| ItemRow contextual action button | Task 8 |
| Props threaded through ItemList + Sidebar | Task 9 |
| E2E delete test | Task 9 |
| Edit trip dates pencil UI + save | Task 10 |
| E2E edit dates test | Task 10 |
| Trip dashboard (donut + grid + stops) | Task 11 |
| `tripItemIds` passed to TripsModal | Task 11 |
| `pinHTML` inTrip glow | Task 1 (param) + Task 12 (wired) |
| PinMarker `inTrip` prop | Task 12 |
| MapView + page.tsx wired | Task 13 |
| Map legend no change needed beyond layout | Task 2 ✓ |
| No new npm deps | ✓ (SVG donut) |
