'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/icon'

interface AddMenuProps {
  onSearchPlace: () => void
  onScratchpad: () => void
  onAddManually: () => void
  onCloseMenu: () => void
}

const SEARCH_COLOR  = 'oklch(0.58 0.16 36)'
const SPARKLE_COLOR = 'oklch(0.50 0.13 145)'
const MANUAL_COLOR  = 'oklch(0.55 0.13 250)'

interface RowProps {
  iconName: 'search' | 'sparkle' | 'edit'
  iconColor: string
  title: string
  subtitle: string
  onClick: () => void
  noBorder?: boolean
}

function MenuRow({ iconName, iconColor, title, subtitle, onClick, noBorder }: RowProps) {
  const rowRef = useRef<HTMLButtonElement>(null)

  return (
    <button
      ref={rowRef}
      onClick={onClick}
      onMouseEnter={() => { if (rowRef.current) rowRef.current.style.background = 'var(--paper-2)' }}
      onMouseLeave={() => { if (rowRef.current) rowRef.current.style.background = 'transparent' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        borderBottom: noBorder ? 'none' : '1px solid var(--paper-2)',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        background: 'transparent',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'var(--font-ui)',
        transition: 'background 100ms',
      }}
    >
      {/* Rounded square icon */}
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: `color-mix(in oklch, ${iconColor} 18%, transparent)`,
          color: iconColor,
        }}
      >
        <Icon name={iconName} size={18} stroke={iconColor} />
      </span>

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
          {title}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.3 }}>
          {subtitle}
        </span>
      </span>
    </button>
  )
}

export function AddMenu({ onSearchPlace, onScratchpad, onAddManually, onCloseMenu }: AddMenuProps) {
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
        boxShadow: '0 8px 32px rgba(0,0,0,.15)',
        overflow: 'hidden',
        minWidth: 240,
      }}
    >
      <MenuRow
        iconName="search"
        iconColor={SEARCH_COLOR}
        title="Search a place"
        subtitle="Autocomplete from Google · auto-categorized"
        onClick={onSearchPlace}
      />
      <MenuRow
        iconName="sparkle"
        iconColor={SPARKLE_COLOR}
        title="Scratchpad"
        subtitle="Type anything · AI sorts it"
        onClick={onScratchpad}
      />
      <MenuRow
        iconName="edit"
        iconColor={MANUAL_COLOR}
        title="Add manually"
        subtitle="Name + category · for offline notes"
        onClick={onAddManually}
        noBorder
      />
    </div>
  )
}
