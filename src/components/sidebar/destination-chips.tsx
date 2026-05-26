'use client'

interface DestinationChipsProps {
  destinations: string[]
  active: string | null
  onChange: (d: string | null) => void
}

export function DestinationChips({ destinations, active, onChange }: DestinationChipsProps) {
  const chipBase: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }

  const activeStyle: React.CSSProperties = {
    ...chipBase,
    background: 'var(--ink)',
    color: 'var(--paper)',
  }

  const inactiveStyle: React.CSSProperties = {
    ...chipBase,
    background: 'var(--paper-2)',
    color: 'var(--ink-2)',
  }

  return (
    <div style={{ padding: '0 14px 10px' }}>
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}
      >
        Destination
      </div>
      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <button
          style={active === null ? activeStyle : inactiveStyle}
          onClick={() => onChange(null)}
        >
          All
        </button>
        {destinations.map((dest) => (
          <button
            key={dest}
            style={active === dest ? activeStyle : inactiveStyle}
            onClick={() => onChange(dest)}
          >
            {dest.split(',')[0]}
          </button>
        ))}
      </div>
    </div>
  )
}
