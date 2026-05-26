'use client'

import { useState, useRef } from 'react'
import { ModalBase } from '@/components/ui/modal-base'
import { Icon } from '@/components/ui/icon'
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
  const [composeEntries, setComposeEntries] = useState<ScratchpadEntry[]>([])
  const [autoRunIds, setAutoRunIds] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleComposeInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComposeText(e.target.value)
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
    setAutoRunIds((prev) => new Set([...prev, tempEntry.id]))
    setComposeText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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
      {/* Green header band */}
      <div
        style={{
          background: 'oklch(0.95 0.04 145)',
          padding: '20px 24px 18px',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="sparkle" size={18} stroke="oklch(0.45 0.14 145)" />
          <h2
            className="font-serif"
            style={{ margin: 0, fontSize: 20, color: 'var(--ink)', fontWeight: 700 }}
          >
            Scratchpad
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'oklch(0.45 0.08 145)' }}>
          Dump anything — restaurant tip, IG handle, half-thought trip idea. AI sorts it.
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px 20px' }}>
        {/* Compose row — input + button side by side */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
          <textarea
            ref={textareaRef}
            className="input"
            rows={1}
            placeholder="e.g. that natural-wine bar in setagaya — ahiru store, opens at 5"
            value={composeText}
            onChange={handleComposeInput}
            onKeyDown={handleComposeKeyDown}
            style={{ resize: 'none', overflow: 'hidden', flex: 1, minHeight: 42 }}
          />
          <button
            className="btn-primary"
            onClick={handleSort}
            disabled={!composeText.trim()}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Icon name="sparkle" size={14} stroke="currentColor" />
            Sort it
          </button>
        </div>

        {/* Hint text */}
        <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
          ⌘+Enter to categorize · uses Claude
        </p>

        {/* Entry list */}
        {allEntries.map((entry) => (
          <ScratchpadRow
            key={entry.id}
            entry={entry}
            onSaved={handleSaved}
            onDiscarded={handleDiscarded}
            autoRun={autoRunIds.has(entry.id)}
          />
        ))}

        {allEntries.length === 0 && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '20px 0' }}>
            No entries yet — add your first thought above.
          </p>
        )}
      </div>
    </ModalBase>
  )
}
