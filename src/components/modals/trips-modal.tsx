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

function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate && !endDate) return null
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`
  if (startDate) return `From ${fmt(startDate)}`
  if (endDate) return `Until ${fmt(endDate)}`
  return null
}

export function TripsModal({ trips, activeTripId, onActivate, onClose, onTripsUpdated }: TripsModalProps) {
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, destination: destination.trim() || undefined }),
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
      setFormOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  function handleRowClick(tripId: string) {
    onActivate(tripId)
    onClose()
  }

  return (
    <ModalBase onClose={onClose}>
      <h2 style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: 'var(--ink)' }}>
        Trips
      </h2>

      {/* New trip section */}
      <div style={{ marginBottom: 12 }}>
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '6px 0',
            }}
          >
            <Icon name="plus" size={14} />
            New trip
          </button>
        ) : (
          <div
            style={{
              background: 'var(--paper-2)',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                type="text"
                placeholder="Trip name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  border: '1px solid var(--paper-3)',
                  borderRadius: 6,
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Destination (optional)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  border: '1px solid var(--paper-3)',
                  borderRadius: 6,
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            {error && (
              <p style={{ margin: 0, fontSize: 12, color: '#c0392b' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                style={{
                  padding: '7px 14px',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: creating || !name.trim() ? 'not-allowed' : 'pointer',
                  opacity: creating || !name.trim() ? 0.6 : 1,
                }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setFormOpen(false); setName(''); setDestination(''); setError(null) }}
                style={{
                  padding: '7px 14px',
                  background: 'none',
                  color: 'var(--ink-2)',
                  border: '1px solid var(--paper-3)',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trip list */}
      {localTrips.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--ink-3)',
            fontSize: 14,
            margin: '24px 0',
          }}
        >
          No trips yet. Create one above.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {localTrips.map((trip) => {
            const isActive = trip.id === activeTripId
            const dateRange = formatDateRange(trip.start_date, trip.end_date)
            return (
              <li key={trip.id}>
                <button
                  onClick={() => handleRowClick(trip.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--paper-2)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon name="suitcase" size={16} stroke="var(--ink-2)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>
                        {trip.name}
                      </span>
                      {trip.destination && (
                        <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                          {trip.destination}
                        </span>
                      )}
                    </div>
                    {dateRange && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                        {dateRange}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <Icon name="check" size={16} stroke="oklch(0.55 0.16 145)" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </ModalBase>
  )
}
