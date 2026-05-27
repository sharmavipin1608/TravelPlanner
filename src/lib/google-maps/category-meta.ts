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
