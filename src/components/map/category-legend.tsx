import { CATEGORY_META } from '@/lib/google-maps/category-meta'
import type { Category } from '@/types'

interface CategoryLegendProps {
  show: boolean
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 80,
  left: 396,
  zIndex: 10,
  padding: '10px 14px',
  background: 'rgba(250,246,236,.82)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
}

const CATEGORIES: Category[] = ['place', 'restaurant', 'accommodation', 'activity']

function dotStyle(color: string): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: color,
    flexShrink: 0,
  }
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '3px 0',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--ink)',
}

export function CategoryLegend({ show }: CategoryLegendProps) {
  if (!show) return null

  return (
    <div style={containerStyle}>
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat]
        return (
          <div key={cat} style={rowStyle}>
            <span style={dotStyle(meta.color)} />
            <span>{meta.label}</span>
          </div>
        )
      })}
    </div>
  )
}
