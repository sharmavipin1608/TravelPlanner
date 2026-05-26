'use client'

import { useState, useEffect } from 'react'
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
      if (json.data) {
        setFields({
          name: json.data.name ?? '',
          category: (json.data.category as Category | '') ?? '',
          destination: json.data.destination ?? '',
          notes: json.data.notes ?? '',
        })
      }
    } catch {
      // On error fall through to review with empty fields
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

  return (
    <div
      style={{
        border: '1px solid var(--paper-3)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
      }}
    >
      {/* Raw text always visible */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-2)', flex: 1 }}>
          &ldquo;{entry.raw_text}&rdquo;
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 10, flexShrink: 0 }}>
          just now
        </span>
      </div>

      {state === 'pending' && (
        <div>
          <button className="btn-primary" onClick={runCategorize}>
            Sort it
          </button>
        </div>
      )}

      {state === 'thinking' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span style={{ color: 'var(--ink-3)', fontSize: 13, marginLeft: 4 }}>
            Sorting…
          </span>
        </div>
      )}

      {state === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-3)' }}>Name</label>
              <input
                className="input"
                value={fields.name}
                onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-3)' }}>Category</label>
              <select
                className="input"
                value={fields.category}
                onChange={(e) =>
                  setFields((f) => ({ ...f, category: e.target.value as Category | '' }))
                }
              >
                <option value="">—</option>
                <option value="place">Place</option>
                <option value="restaurant">Restaurant</option>
                <option value="accommodation">Accommodation</option>
                <option value="activity">Activity</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-3)' }}>Destination</label>
              <input
                className="input"
                value={fields.destination}
                onChange={(e) =>
                  setFields((f) => ({ ...f, destination: e.target.value }))
                }
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-3)' }}>Notes</label>
              <textarea
                className="input"
                rows={2}
                value={fields.notes}
                onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-3)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '4px 0',
                }}
                onClick={() => onDiscarded(entry.id)}
              >
                Discard
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-3)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '4px 0',
                }}
                onClick={runCategorize}
              >
                Re-run
              </button>
            </div>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !fields.name.trim()}
            >
              {saving ? 'Saving…' : 'Save place'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
