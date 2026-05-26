'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/icon'
import type { Item, ScratchpadEntry, Category } from '@/types'
import type { CategorizedItem } from '@/lib/ai/types'

type RowState = 'pending' | 'thinking' | 'review'

interface ReviewFields {
  name: string
  category: Category | ''
  destination: string
  notes: string
}

interface ScratchpadRowProps {
  entry: ScratchpadEntry
  onSaved: (item: Item, entryId: string) => void
  onDiscarded: (entryId: string) => void
  autoRun?: boolean
}

export function ScratchpadRow({ entry, onSaved, onDiscarded, autoRun = false }: ScratchpadRowProps) {
  const [state, setState] = useState<RowState>('pending')
  const [fields, setFields] = useState<ReviewFields>({
    name: '',
    category: '',
    destination: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (autoRun) runCategorize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runCategorize() {
    setState('thinking')
    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: entry.raw_text, entry_id: entry.id }),
      })
      const json = (await res.json()) as { data: CategorizedItem | null; error: unknown }
      // Always populate fields — fall back to raw text for name if AI failed
      const d = json.data
      setFields({
        name: d?.name ?? entry.raw_text,
        category: (d?.category as Category | '') ?? '',
        destination: d?.destination ?? '',
        notes: d?.notes ?? '',
      })
    } catch {
      setFields((f) => ({ ...f, name: f.name || entry.raw_text }))
    }
    setState('review')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.name,
          category: fields.category || undefined,
          destination: fields.destination || undefined,
          notes: fields.notes || undefined,
          status: 'wishlist',
        }),
      })
      const json = (await res.json()) as { data: Item | null; error: unknown }
      if (json.data) {
        onSaved(json.data, entry.id)
      }
    } finally {
      setSaving(false)
    }
  }

  const cardBg = state === 'pending'
    ? 'var(--paper-2)'
    : state === 'thinking'
    ? 'oklch(0.97 0.02 152)'
    : '#fff'

  const cardBorder = state === 'thinking'
    ? '0.5px solid oklch(0.78 0.10 152)'
    : '0.5px solid var(--line, rgba(60,50,30,.10))'

  return (
    <div
      style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
        transition: 'border-color .15s, background .15s',
      }}
    >
      {/* Quote + timestamp */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 14.5,
            fontStyle: 'italic',
            color: 'var(--ink)',
            lineHeight: 1.4,
          }}
        >
          &ldquo;{entry.raw_text}&rdquo;
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          just now
        </div>
      </div>

      {/* Pending state */}
      {state === 'pending' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={runCategorize}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: 'oklch(0.45 0.13 152)',
              color: '#fff',
              border: 'none',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Icon name="sparkle" size={13} stroke="#fff" />
            Categorize
          </button>
          <button
            onClick={() => onDiscarded(entry.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              fontSize: 13,
              padding: '4px 0',
            }}
          >
            discard
          </button>
        </div>
      )}

      {/* Thinking state */}
      {state === 'thinking' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'oklch(0.55 0.12 152)',
                  animation: `tp-pulse 1.05s ${i * 0.18}s infinite ease-in-out`,
                  display: 'block',
                }}
              />
            ))}
          </div>
          <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Sorting…</span>
        </div>
      )}

      {/* Review state */}
      {state === 'review' && (
        <>
          <div
            style={{
              borderTop: '0.5px solid rgba(60,50,30,.10)',
              paddingTop: 12,
              marginTop: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px 14px',
              marginBottom: 12,
            }}
          >
            <FieldCell label="Name">
              <input
                value={fields.name}
                onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
                style={inlineInputStyle}
              />
            </FieldCell>
            <FieldCell label="Category">
              <select
                value={fields.category}
                onChange={(e) => setFields((f) => ({ ...f, category: e.target.value as Category | '' }))}
                style={{ ...inlineInputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">—</option>
                <option value="restaurant">Restaurants</option>
                <option value="place">Places</option>
                <option value="accommodation">Stays</option>
                <option value="activity">Activities</option>
              </select>
            </FieldCell>
            <FieldCell label="Destination">
              <input
                value={fields.destination}
                onChange={(e) => setFields((f) => ({ ...f, destination: e.target.value }))}
                style={inlineInputStyle}
              />
            </FieldCell>
            <FieldCell label="Area / Notes">
              <input
                value={fields.notes}
                onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
                style={inlineInputStyle}
              />
            </FieldCell>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onDiscarded(entry.id)}
              style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 13, padding: '4px 0' }}
            >
              discard
            </button>
            <button
              onClick={runCategorize}
              style={{
                background: 'none',
                border: '1px solid var(--paper-3)',
                color: 'var(--ink-2)',
                cursor: 'pointer',
                fontSize: 13,
                padding: '5px 12px',
                borderRadius: 20,
              }}
            >
              re-run
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !fields.name.trim()}
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 16px',
                background: saving || !fields.name.trim() ? 'var(--ink-3)' : 'var(--ink)',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                cursor: saving || !fields.name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <Icon name="check" size={13} stroke="#fff" strokeWidth={2.5} />
                  Save place
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 3,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

const inlineInputStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderBottom: '0.5px solid rgba(60,50,30,.18)',
  background: 'transparent',
  padding: '3px 0',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: 'inherit',
}
