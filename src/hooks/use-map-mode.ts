'use client'

import type { Filters } from './use-filters'

export type MapMode = 'world' | 'local'

export function useMapMode(filters: Filters): { mode: MapMode; destination: string | null } {
  return {
    mode: filters.destination ? 'local' : 'world',
    destination: filters.destination,
  }
}
