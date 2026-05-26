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
