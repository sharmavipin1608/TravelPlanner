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
    fontSize: '13px',
    cursor: 'pointer',
    border: 'none',
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
    <div
      style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        padding: '0 16px 12px',
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
          {dest}
        </button>
      ))}
    </div>
  )
}
