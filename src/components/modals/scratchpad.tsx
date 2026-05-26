'use client'

import { useState, useRef } from 'react'
import { ModalBase } from '@/components/ui/modal-base'
import { ScratchpadRow } from './scratchpad-row'
import type { Item, ScratchpadEntry } from '@/types'

interface ScratchpadProps {
  entries: ScratchpadEntry[]
  onClose: () => void
  onSaved: (item: Item, entryId: string) => void
  onDiscarded: (entryId: string) => void
}

export function Scratchpad({ entries, onClose, onSaved, onDiscarded }: ScratchpadProps) {
  const [composeText, setComposeText] = useState('')
  // Local compose entries that were submitted but have not yet been saved/discarded
  const [composeEntries, setComposeEntries] = useState<ScratchpadEntry[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleComposeInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComposeText(e.target.value)
    // Auto-grow: reset height then set to scrollHeight
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleSort() {
    const text = composeText.trim()
    if (!text) return

    const tempEntry: ScratchpadEntry = {
      id: crypto.randomUUID(),
      user_id: '',
      raw_text: text,
      processed: false,
      created_item_id: null,
      created_at: new Date().toISOString(),
    }

    setComposeEntries((prev) => [tempEntry, ...prev])
    setComposeText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleComposeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSort()
    }
  }

  function handleSaved(item: Item, entryId: string) {
    setComposeEntries((prev) => prev.filter((e) => e.id !== entryId))
    onSaved(item, entryId)
  }

  function handleDiscarded(entryId: string) {
    setComposeEntries((prev) => prev.filter((e) => e.id !== entryId))
    onDiscarded(entryId)
  }

  const allEntries = [...composeEntries, ...entries]

  return (
    <ModalBase onClose={onClose} maxWidth={580}>
      <div style={{ padding: '24px 24px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h2
            className="font-serif"
            style={{ margin: 0, fontSize: 20, color: 'var(--ink)', fontWeight: 600 }}
          >
            Brain dump
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            Dump your thoughts, Claude will sort them.
          </p>
        </div>

        {/* Compose row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <textarea
            ref={textareaRef}
            className="input"
            rows={3}
            placeholder="Nobu Tokyo, also check out that ramen place near the station…"
            value={composeText}
            onChange={handleComposeInput}
            onKeyDown={handleComposeKeyDown}
            style={{ resize: 'none', overflow: 'hidden' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={handleSort}
              disabled={!composeText.trim()}
            >
              Sort it
            </button>
          </div>
        </div>

        {/* Divider */}
        {allEntries.length > 0 && (
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--paper-3)',
              margin: '0 0 14px',
            }}
          />
        )}

        {/* Entry list */}
        {allEntries.map((entry) => (
          <ScratchpadRow
            key={entry.id}
            entry={entry}
            onSaved={handleSaved}
            onDiscarded={handleDiscarded}
          />
        ))}

        {allEntries.length === 0 && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ink-3)',
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            No entries yet — add your first thought above.
          </p>
        )}
      </div>
    </ModalBase>
  )
}
