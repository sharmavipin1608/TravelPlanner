'use client'

import { useState } from 'react'
import { ModalBase } from '@/components/ui/modal-base'
import type { Item } from '@/types'

interface Props {
  item: Item
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function DeleteConfirmModal({ item, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={400}>
      <div style={{ padding: '28px 28px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(220,50,30,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
            fontSize: 20,
          }}>
            🗑
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            Delete {item.name}?
          </div>
          {item.destination && (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              {item.destination}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>
            This action cannot be undone.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--paper-3)',
              background: 'var(--paper-2)',
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'oklch(0.55 0.18 14)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </ModalBase>
  )
}
