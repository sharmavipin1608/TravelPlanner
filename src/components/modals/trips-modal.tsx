'use client'

import { useState } from 'react'
import { ModalBase } from '@/components/ui/modal-base'
import { Icon } from '@/components/ui/icon'
import type { Trip, ApiResponse } from '@/types'

interface TripsModalProps {
  trips: Trip[]
  activeTripId: string | null
  onActivate: (tripId: string) => void
  onClose: () => void
  onTripsUpdated: (trips: Trip[]) => void
}


export function TripsModal({ trips, activeTripId, onActivate, onClose, onTripsUpdated }: TripsModalProps) {
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ start_date: string; end_date: string }>({ start_date: '', end_date: '' })

  async function handleCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          destination: destination.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
      })
      const json = (await res.json()) as ApiResponse<Trip>
      if (!res.ok || json.error || !json.data) {
        setError(json.error?.message ?? 'Failed to create trip')
        return
      }
      const newTrip = json.data
      const updated = [...localTrips, newTrip]
      setLocalTrips(updated)
      onTripsUpdated(updated)
      onActivate(newTrip.id)
      setName('')
      setDestination('')
      setStartDate('')
      setEndDate('')
      setFormOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveDates(tripId: string) {
    const res = await fetch(`/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: editDraft.start_date || null,
        end_date: editDraft.end_date || null,
      }),
    })
    if (res.ok) {
      const { data } = await res.json()
      const updated = localTrips.map((t) => (t.id === tripId ? data : t))
      setLocalTrips(updated)
      onTripsUpdated(updated)
      setEditingId(null)
    }
  }

  function handleRowClick(tripId: string) {
    onActivate(tripId)
    onClose()
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      {/* Blue/indigo header accent */}
      <div
        style={{
          background: 'oklch(0.96 0.04 280)',
          padding: '18px 20px 14px',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.012em',
            color: 'var(--ink)',
            margin: '0 0 4px',
          }}
        >
          Trips
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
          Pull from your saved places into a plan.
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>
        {/* Trip list */}
        {localTrips.map((trip) => {
          const isActive = trip.id === activeTripId
          const destinationLabel = trip.destination ? trip.destination.split(',')[0] : null

          return (
            <button
              key={trip.id}
              onClick={() => handleRowClick(trip.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '14px 16px',
                background: '#fff',
                border: isActive
                  ? '.5px solid oklch(0.55 0.18 280)'
                  : '.5px solid var(--line, rgba(60,50,30,.10))',
                boxShadow: isActive ? '0 0 0 1px oklch(0.55 0.18 280) inset' : 'none',
                borderRadius: 10,
                marginTop: 8,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color .12s, background .12s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 17,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {trip.name}
                </div>
                {destinationLabel && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                    {destinationLabel}
                  </div>
                )}
                {/* Date section */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {editingId === trip.id ? (
                    <>
                      <input
                        type="date"
                        value={editDraft.start_date}
                        onChange={(e) => setEditDraft((d) => ({ ...d, start_date: e.target.value }))}
                        style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--paper-3)', background: 'var(--paper-2)', color: 'var(--ink)' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>→</span>
                      <input
                        type="date"
                        value={editDraft.end_date}
                        onChange={(e) => setEditDraft((d) => ({ ...d, end_date: e.target.value }))}
                        style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--paper-3)', background: 'var(--paper-2)', color: 'var(--ink)' }}
                      />
                      <button
                        onClick={() => handleSaveDates(trip.id)}
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: 'none', background: 'oklch(0.55 0.18 280)', color: '#fff', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--paper-3)', background: 'var(--paper-2)', color: 'var(--ink)', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {trip.start_date ? `${trip.start_date}` : 'No start'} → {trip.end_date ? `${trip.end_date}` : 'No end'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(trip.id)
                          setEditDraft({ start_date: trip.start_date ?? '', end_date: trip.end_date ?? '' })
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                        title="Edit dates"
                      >
                        <Icon name="edit" size={12} stroke="var(--ink-3)" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ color: 'var(--ink-3)', flexShrink: 0, marginLeft: 12 }}>
                {isActive ? (
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'oklch(0.96 0.04 280)',
                      color: 'oklch(0.40 0.18 280)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    planning
                  </span>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}

        {/* New trip row / form */}
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '14px 16px',
              background: 'none',
              border: '.5px solid var(--line, rgba(60,50,30,.10))',
              borderRadius: 10,
              marginTop: 8,
              cursor: 'pointer',
              color: 'var(--ink-3)',
              fontSize: 14,
            }}
          >
            <Icon name="plus" size={14} stroke="var(--ink-3)" />
            New trip
          </button>
        ) : (
          <div
            style={{
              background: '#fff',
              border: '.5px solid var(--line, rgba(60,50,30,.10))',
              borderRadius: 10,
              padding: 14,
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <input
              autoFocus
              type="text"
              placeholder="Trip name — e.g. Tokyo May 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Destination (optional)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Start date</div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>End date</div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            {error && (
              <p style={{ margin: 0, fontSize: 12, color: '#c0392b' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 2, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setFormOpen(false)
                  setName('')
                  setDestination('')
                  setStartDate('')
                  setEndDate('')
                  setError(null)
                }}
                style={{
                  padding: '7px 14px',
                  background: 'none',
                  color: 'var(--ink-2)',
                  border: '1px solid var(--paper-3)',
                  borderRadius: 7,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                style={{
                  padding: '7px 16px',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: creating || !name.trim() ? 'not-allowed' : 'pointer',
                  opacity: creating || !name.trim() ? 0.6 : 1,
                }}
              >
                {creating ? 'Creating…' : 'Create trip'}
              </button>
            </div>
          </div>
        )}

        {localTrips.length === 0 && !formOpen && (
          <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, margin: '12px 0 4px' }}>
            No trips yet.
          </p>
        )}
      </div>
    </ModalBase>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--paper-3)',
  borderRadius: 6,
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}
