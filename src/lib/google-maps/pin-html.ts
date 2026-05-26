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

export function pinHTML(
  item: Item,
  style: PinStyle,
  selected: boolean,
  dimmed: boolean
): string {
  const meta = item.category ? CATEGORY_META[item.category] : { hue: 0, glyph: 'star' as const }
  const color = `oklch(0.62 0.16 ${meta.hue})`
  const opacity = dimmed ? 'opacity: 0.25;' : ''
  const shadow = selected ? 'filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));' : ''

  if (style === 'dot') {
    return `<div style="${opacity}${shadow}">
      <svg viewBox="-18 -18 36 36" width="36" height="36" overflow="visible">
        ${selected ? `<circle r="17" fill="${color}" opacity=".18" />` : ''}
        <circle r="11" fill="${color}" stroke="#fff" stroke-width="2.2" />
        <g transform="translate(0 0)">${glyphSVG(meta.glyph)}</g>
      </svg>
    </div>`
  }

  if (style === 'ring') {
    return `<div style="${opacity}${shadow}">
      <svg viewBox="-18 -18 36 36" width="36" height="36" overflow="visible">
        ${selected ? `<circle r="19" fill="none" stroke="${color}" stroke-width="1" opacity=".6" />` : ''}
        <circle r="12" fill="#fff" stroke="${color}" stroke-width="3" />
        <circle r="5" fill="${color}" />
      </svg>
    </div>`
  }

  // teardrop (default) — anchor point at bottom (0, 20)
  return `<div style="${opacity}${shadow}">
    <svg viewBox="-16 -22 32 46" width="32" height="46" overflow="visible">
      ${selected ? '<ellipse cx="0" cy="20" rx="9" ry="3" fill="rgba(0,0,0,.22)" />' : ''}
      <path d="M0 -16 C -9 -16 -13 -9 -13 -3 C -13 5 -4 12 0 20 C 4 12 13 5 13 -3 C 13 -9 9 -16 0 -16 Z"
            fill="${color}" stroke="#fff" stroke-width="1.6" />
      <g transform="translate(0 -4)">${glyphSVG(meta.glyph)}</g>
    </svg>
  </div>`
}
