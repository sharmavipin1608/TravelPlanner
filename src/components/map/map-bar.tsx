'use client'

import { Icon } from '@/components/ui/icon'

interface MapBarProps {
  mode: 'world' | 'local'
  destination: string | null
  itemCount: number
  onBackToWorld: () => void
}

const barStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  background: 'rgba(250,246,236,.82)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
  color: 'var(--ink)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'default',
  userSelect: 'none',
}

const backBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--ink-3)',
  fontSize: 13,
  fontWeight: 500,
}

export function MapBar({ mode, destination, itemCount, onBackToWorld }: MapBarProps) {
  return (
    <div style={barStyle}>
      {mode === 'world' ? (
        <>
          <Icon name="globe" size={15} />
          <span>{itemCount} places</span>
        </>
      ) : (
        <>
          <Icon name="pin" size={15} />
          <span>{destination}</span>
          <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>{itemCount}</span>
          <button style={backBtnStyle} onClick={onBackToWorld} type="button">
            <Icon name="arrow-left" size={14} />
            Back
          </button>
        </>
      )}
    </div>
  )
}
