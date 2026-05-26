'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/icon'

interface AddMenuProps {
  onSearchPlace: () => void
  onScratchpad: () => void
  onCloseMenu: () => void
}

const SEARCH_COLOR = 'oklch(0.62 0.16 36)'
const SPARKLE_COLOR = 'oklch(0.62 0.16 152)'

function hexToRgba(color: string, opacity: number) {
  // For oklch colors we can't easily parse — use inline style with color-mix or just pass opacity via the circle bg
  return { color, bgColor: color }
}

interface RowProps {
  iconName: 'search' | 'sparkle'
  iconColor: string
  title: string
  subtitle: string
  onClick: () => void
  noBorder?: boolean
}

function MenuRow({ iconName, iconColor, title, subtitle, onClick, noBorder }: RowProps) {
  const rowRef = useRef<HTMLButtonElement>(null)

  function handleMouseEnter() {
    if (rowRef.current) rowRef.current.style.background = 'var(--paper-2)'
  }
  function handleMouseLeave() {
    if (rowRef.current) rowRef.current.style.background = 'transparent'
  }

  return (
    <button
      ref={rowRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        borderBottom: noBorder ? 'none' : '1px solid var(--paper-2)',
        transition: 'background 100ms',
        background: 'transparent',
        border: 'none',
        borderBottomWidth: noBorder ? 0 : 1,
        borderBottomStyle: noBorder ? undefined : 'solid',
        borderBottomColor: noBorder ? undefined : 'var(--paper-2)',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Icon circle */}
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: `color-mix(in oklch, ${iconColor} 15%, transparent)`,
          color: iconColor,
        }}
      >
        <Icon name={iconName} size={18} stroke={iconColor} />
      </span>

      {/* Text */}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink)',
            lineHeight: 1.3,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--ink-3)',
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </span>
      </span>
    </button>
  )
}

export function AddMenu({ onSearchPlace, onScratchpad, onCloseMenu }: AddMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMenu()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onCloseMenu])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        bottom: 80,
        right: 24,
        zIndex: 20,
        background: 'var(--paper)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        overflow: 'hidden',
        minWidth: 220,
      }}
    >
      <MenuRow
        iconName="search"
        iconColor={SEARCH_COLOR}
        title="Search a place"
        subtitle="Find on Google Maps"
        onClick={onSearchPlace}
      />
      <MenuRow
        iconName="sparkle"
        iconColor={SPARKLE_COLOR}
        title="Brain dump"
        subtitle="Sort later with AI"
        onClick={onScratchpad}
        noBorder
      />
    </div>
  )
}
