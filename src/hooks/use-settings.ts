'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Settings {
  pinStyle: 'teardrop' | 'dot' | 'ring'
  density: 'compact' | 'regular' | 'comfy'
  showLegend: boolean
  mapStyle: 'paper' | 'cool' | 'dusk' | 'satellite'
}

const DEFAULTS: Settings = {
  pinStyle: 'teardrop',
  density: 'regular',
  showLegend: true,
  mapStyle: 'paper',
}

const STORAGE_KEY = 'tp-settings'

const DENSITY_PAD: Record<Settings['density'], string> = {
  compact: '10px',
  regular: '13px',
  comfy: '18px',
}

function applyDensity(density: Settings['density']) {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--pad-y', DENSITY_PAD[density])
  }
}

export function useSettings(): [Settings, <K extends keyof Settings>(key: K, value: Settings[K]) => void] {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = { ...DEFAULTS, ...JSON.parse(stored) } as Settings
        setSettings(parsed)
        applyDensity(parsed.density)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      if (key === 'density') applyDensity(value as Settings['density'])
      return next
    })
  }, [])

  return [settings, updateSetting]
}
