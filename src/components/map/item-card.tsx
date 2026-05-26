'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'
import type { Item, Trip } from '@/types'

export interface ItemCardProps {
  item: Item
  activeTrip: Trip | null
  inActiveTrip: boolean
  onClose: () => void
  onAddToTrip: (item: Item) => void
  onToggleTrip: (item: Item) => void
  onOpenTrips: () => void
}

export function ItemCard({
  item,
  activeTrip,
  inActiveTrip,
  onClose,
  onAddToTrip,
  onToggleTrip,
}: ItemCardProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation on mount
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const meta = item.category ? CATEGORY_META[item.category] : null
  const hue = meta?.hue ?? 0
  const categoryLabel = meta?.label ?? 'Unknown'

  const headerGradient = `linear-gradient(135deg, oklch(0.62 0.16 ${hue}) 0%, oklch(0.72 0.12 ${hue}) 100%)`
  const placeholderGradient = `linear-gradient(135deg, oklch(0.68 0.14 ${hue}) 0%, oklch(0.76 0.10 ${hue}) 100%)`

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: 396,
        zIndex: 15,
        width: 340,
        background: 'var(--paper)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        overflow: 'hidden',
        transform: visible ? 'translateX(0)' : 'translateX(-10px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'relative',
          height: 120,
          background: headerGradient,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '0 12px 12px',
        }}
      >
        {/* Photo placeholder */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: placeholderGradient,
            opacity: 0.4,
          }}
          aria-hidden="true"
        />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,.2)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: 28,
            height: 28,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <Icon name="x" size={14} stroke="#fff" strokeWidth={2} />
        </button>

        {/* Category tag */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {/* Color dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#fff',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              color: '#fff',
              fontSize: 11,
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 16px 12px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 4px',
            lineHeight: 1.25,
          }}
        >
          {item.name}
        </h2>

        {item.destination && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ink-3)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {item.destination}
          </p>
        )}

        {item.notes && (
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 13,
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-ui)',
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.notes}
          </p>
        )}
      </div>

      {/* Actions row */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--paper-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {activeTrip ? (
          /* Active trip: single full-width toggle button */
          <button
            onClick={() => onToggleTrip(item)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 16px',
              background: inActiveTrip
                ? 'oklch(0.55 0.16 145)'
                : 'var(--ink)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.88'
            }}
            onMouseOut={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
            }}
          >
            {inActiveTrip ? (
              <>
                <Icon name="check" size={14} stroke="#fff" strokeWidth={2} />
                In {activeTrip.name}
              </>
            ) : (
              <>Add to {activeTrip.name}</>
            )}
          </button>
        ) : (
          /* No active trip: add + icon action buttons */
          <>
            <button
              className="btn-primary"
              onClick={() => onAddToTrip(item)}
              style={{ flex: 1 }}
            >
              Add to a trip
            </button>

            <button
              aria-label="Edit item"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                background: 'transparent',
                border: '1px solid var(--paper-3)',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--ink-2)',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'var(--paper-2)'
              }}
              onMouseOut={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'transparent'
              }}
            >
              <Icon name="edit" size={15} strokeWidth={1.5} />
            </button>

            <button
              aria-label="View layers"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                background: 'transparent',
                border: '1px solid var(--paper-3)',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--ink-2)',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'var(--paper-2)'
              }}
              onMouseOut={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'transparent'
              }}
            >
              <Icon name="layers" size={15} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
