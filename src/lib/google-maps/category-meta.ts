import type { Category } from '@/types'

export type Glyph = 'fork' | 'mountain' | 'bed' | 'star'

export interface CategoryMeta {
  hue: number
  label: string
  glyph: Glyph
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  restaurant:    { hue: 14,  label: 'Restaurants', glyph: 'fork' },
  place:         { hue: 36,  label: 'Places',       glyph: 'mountain' },
  accommodation: { hue: 216, label: 'Stays',        glyph: 'bed' },
  activity:      { hue: 152, label: 'Activities',   glyph: 'star' },
}
