'use client'

import type { Item, Category } from '@/types'

const CATEGORY_META: Record<Category, { hue: number; label: string }> = {
  restaurant: { hue: 14, label: 'Restaurants' },
  place: { hue: 36, label: 'Places' },
  accommodation: { hue: 216, label: 'Stays' },
  activity: { hue: 152, label: 'Activities' },
}

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
        gap: '8px',
        padding: '0 16px 12px',
      }}
    >
      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat]
        const count = filteredItems.filter((item) => item.category === cat).length
        const isActive = activeCategory === cat
        const borderColor = `oklch(0.62 0.16 ${meta.hue})`

        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'var(--paper-2)',
              cursor: 'pointer',
              border: isActive ? `2px solid ${borderColor}` : '2px solid transparent',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--ink)',
                lineHeight: 1.2,
              }}
            >
              {count}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--ink-3)',
                marginTop: '2px',
              }}
            >
              {meta.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
