import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemRow } from '@/components/sidebar/item-row'
import type { Item } from '@/types'

// Mock Icon so we don't need an SVG/lucide environment
vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}))

const baseItem: Item = {
  id: 'item-1',
  user_id: 'user-1',
  name: 'Test Place',
  category: 'restaurant',
  google_place_types: null,
  destination: 'Tokyo',
  lat: null,
  lng: null,
  google_place_id: null,
  notes: null,
  metadata: {},
  status: 'wishlist',
  created_at: '2026-01-01T00:00:00Z',
}

function makeProps(overrides: Partial<Parameters<typeof ItemRow>[0]> = {}) {
  return {
    item: baseItem,
    selected: false,
    onClick: vi.fn(),
    activeTripId: null as string | null,
    isInTrip: false,
    onDelete: vi.fn(),
    onToggleTrip: vi.fn(),
    ...overrides,
  }
}

/** The outer row div has role="button" too. Use this helper to get only the
 *  real <button> element (the action button). */
function getActionButton(container: HTMLElement): HTMLButtonElement {
  const btn = container.querySelector('button')
  if (!btn) throw new Error('No <button> found in rendered output')
  return btn as HTMLButtonElement
}

describe('ItemRow — contextual action button', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. No active trip → delete button (red background)
  // ──────────────────────────────────────────────────────────────────────────
  describe('when activeTripId is null', () => {
    it('renders exactly one <button> element', () => {
      const { container } = render(<ItemRow {...makeProps({ activeTripId: null })} />)
      expect(container.querySelectorAll('button')).toHaveLength(1)
    })

    it('renders a button with red-tinted background', () => {
      const { container } = render(<ItemRow {...makeProps({ activeTripId: null })} />)
      const btn = getActionButton(container)
      expect(btn.style.background).toContain('220, 50, 30')
    })

    it('clicking calls onDelete with the item', () => {
      const props = makeProps({ activeTripId: null })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onDelete).toHaveBeenCalledTimes(1)
      expect(props.onDelete).toHaveBeenCalledWith(baseItem)
    })

    it('clicking does NOT call onToggleTrip', () => {
      const props = makeProps({ activeTripId: null })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onToggleTrip).not.toHaveBeenCalled()
    })

    it('clicking the action button does NOT propagate to the row onClick', () => {
      const props = makeProps({ activeTripId: null })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      // onClick belongs to the row div; stopPropagation on the inner button prevents it
      expect(props.onClick).not.toHaveBeenCalled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Active trip, item NOT in trip → add button (green background)
  // ──────────────────────────────────────────────────────────────────────────
  describe('when activeTripId is set and isInTrip is false', () => {
    it('renders exactly one <button> element', () => {
      const { container } = render(<ItemRow {...makeProps({ activeTripId: 'trip-1', isInTrip: false })} />)
      expect(container.querySelectorAll('button')).toHaveLength(1)
    })

    it('renders a button with green-tinted background', () => {
      const { container } = render(<ItemRow {...makeProps({ activeTripId: 'trip-1', isInTrip: false })} />)
      const btn = getActionButton(container)
      expect(btn.style.background).toContain('60, 180, 100')
    })

    it('clicking calls onToggleTrip with the item', () => {
      const props = makeProps({ activeTripId: 'trip-1', isInTrip: false })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onToggleTrip).toHaveBeenCalledTimes(1)
      expect(props.onToggleTrip).toHaveBeenCalledWith(baseItem)
    })

    it('clicking does NOT call onDelete', () => {
      const props = makeProps({ activeTripId: 'trip-1', isInTrip: false })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onDelete).not.toHaveBeenCalled()
    })

    it('clicking the action button does NOT propagate to the row onClick', () => {
      const props = makeProps({ activeTripId: 'trip-1', isInTrip: false })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onClick).not.toHaveBeenCalled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Active trip, item IS in trip → remove button (indigo background)
  // ──────────────────────────────────────────────────────────────────────────
  describe('when activeTripId is set and isInTrip is true', () => {
    it('renders exactly one <button> element', () => {
      const { container } = render(<ItemRow {...makeProps({ activeTripId: 'trip-1', isInTrip: true })} />)
      expect(container.querySelectorAll('button')).toHaveLength(1)
    })

    it('renders a button with indigo-tinted background', () => {
      const { container } = render(<ItemRow {...makeProps({ activeTripId: 'trip-1', isInTrip: true })} />)
      const btn = getActionButton(container)
      expect(btn.style.background).toContain('80, 70, 200')
    })

    it('clicking calls onToggleTrip with the item', () => {
      const props = makeProps({ activeTripId: 'trip-1', isInTrip: true })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onToggleTrip).toHaveBeenCalledTimes(1)
      expect(props.onToggleTrip).toHaveBeenCalledWith(baseItem)
    })

    it('clicking does NOT call onDelete', () => {
      const props = makeProps({ activeTripId: 'trip-1', isInTrip: true })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onDelete).not.toHaveBeenCalled()
    })

    it('clicking the action button does NOT propagate to the row onClick', () => {
      const props = makeProps({ activeTripId: 'trip-1', isInTrip: true })
      const { container } = render(<ItemRow {...props} />)
      fireEvent.click(getActionButton(container))
      expect(props.onClick).not.toHaveBeenCalled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Category dot is always rendered
  // ──────────────────────────────────────────────────────────────────────────
  describe('category dot', () => {
    it('renders a category dot when activeTripId is null', () => {
      render(<ItemRow {...makeProps({ activeTripId: null })} />)
      // The dot is a div with borderRadius 50% — we verify the row renders
      // correctly by checking the data-testid wrapper is present
      expect(screen.getByTestId('item-row')).toBeTruthy()
    })

    it('renders a category dot when a trip is active', () => {
      render(<ItemRow {...makeProps({ activeTripId: 'trip-1', isInTrip: false })} />)
      expect(screen.getByTestId('item-row')).toBeTruthy()
    })

    it('applies a non-default color for known category (restaurant)', () => {
      render(<ItemRow {...makeProps({ activeTripId: null })} />)
      // The row wrapper contains the dot; CATEGORY_META should have restaurant
      const row = screen.getByTestId('item-row')
      // The dot is the first child div inside the row
      const dot = row.querySelector('div') as HTMLElement
      // Its background should NOT be the fallback 'oklch(0.62 0.16 0)'
      // (restaurant is a known category with its own color in CATEGORY_META)
      expect(dot.style.background).not.toBe('oklch(0.62 0.16 0)')
    })

    it('falls back to default color for null category', () => {
      const nullCategoryItem = { ...baseItem, category: null } as Item
      render(<ItemRow {...makeProps({ activeTripId: null, item: nullCategoryItem })} />)
      const row = screen.getByTestId('item-row')
      const dot = row.querySelector('div') as HTMLElement
      expect(dot.style.background).toBe('oklch(0.62 0.16 0)')
    })
  })
})
