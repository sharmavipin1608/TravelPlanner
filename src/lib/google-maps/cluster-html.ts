import type { Category } from '@/types'
import { CATEGORY_META } from './category-meta'

function pieSlicePath(r: number, a0: number, a1: number): string {
  const x0 = r * Math.cos(a0), y0 = r * Math.sin(a0)
  const x1 = r * Math.cos(a1), y1 = r * Math.sin(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M 0 0 L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
}

export function clusterHTML(
  dest: string,
  count: number,
  cats: Category[],
  dimmed: boolean
): string {
  const r = Math.min(26, 16 + count * 1.1)
  const W = (r + 12) * 2
  const label = (dest.split(',')[0] ?? '').toUpperCase()
  const opacity = dimmed ? 'opacity: 0.25;' : ''

  const slices = cats.map((c, i) => {
    const color = `oklch(0.62 0.16 ${CATEGORY_META[c].hue})`
    const a0 = (i / cats.length) * Math.PI * 2 - Math.PI / 2
    const a1 = ((i + 1) / cats.length) * Math.PI * 2 - Math.PI / 2
    return `<path d="${pieSlicePath(r, a0, a1)}" fill="${color}" />`
  }).join('')

  return `<div style="cursor:pointer;${opacity}">
    <svg width="${W}" height="${W + 20}"
         viewBox="${-(r + 12)} ${-(r + 12)} ${W} ${W + 20}"
         overflow="visible">
      <circle r="${r + 5}" fill="rgba(255,255,255,.7)" />
      ${slices}
      <circle r="${r - 8}" fill="#fff" />
      <text text-anchor="middle" y="4" font-size="14" font-weight="700"
            font-family="Inter, system-ui, sans-serif" fill="#222">${count}</text>
      <text text-anchor="middle" y="${r + 16}" font-size="11" font-weight="600"
            letter-spacing=".08em" font-family="Inter, system-ui, sans-serif"
            fill="#222"
            style="paint-order:stroke;stroke:rgba(255,255,255,.9);stroke-width:3">${label}</text>
    </svg>
  </div>`
}
