'use client'

import type { Trip } from '@/types'
import { Icon } from '@/components/ui/icon'

interface ActiveTripPillProps {
  trip: Trip
  stopCount: number
  onDeactivate: () => void
}

export function ActiveTripPill({ trip, stopCount, onDeactivate }: ActiveTripPillProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '8px 16px',
        background: 'oklch(0.82 0.12 80)',
        borderRadius: '24px',
        padding: '8px 12px',
      }}
    >
      <Icon name="suitcase" size={14} stroke="var(--ink)" />
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ink)',
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {trip.name}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--ink-2)', flexShrink: 0 }}>
        {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
      </span>
      <button
        onClick={onDeactivate}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--ink-2)',
          flexShrink: 0,
        }}
        aria-label="Deactivate trip"
      >
        <Icon name="x" size={14} stroke="var(--ink-2)" />
      </button>
    </div>
  )
}
