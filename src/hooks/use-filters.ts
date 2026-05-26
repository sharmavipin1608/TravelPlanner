'use client'

import { useState } from 'react'
import type { Category, Status } from '@/types'

export interface Filters {
  q: string
  destination: string | null
  category: Category | 'all'
  status: Status | 'all'
}

const INITIAL: Filters = {
  q: '',
  destination: null,
  category: 'all',
  status: 'all',
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(INITIAL)
  return { filters, setFilters }
}
