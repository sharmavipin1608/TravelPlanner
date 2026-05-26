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
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
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

  function handleRowClick(tripId: string) {
    onActivate(tripId)
    onClose()
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      {/* Blue/indigo header accent */}
      <div
        style={{
          background: 'oklch(0.92 0.05 252)',
          padding: '18px 20px 14px',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--ink)',
            margin: '0 0 2px',
          }}
        >
          Trips
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: 'oklch(0.4 0.05 252)' }}>
          Pull from your saved places into a plan.
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px 20px' }}>
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
                fontWeight: 500,
              }}
            >
              <Icon name="plus" size={14} />
              New trip
            </button>
          ) : (
            <div
              style={{
                background: 'var(--paper-2)',
                borderRadius: 10,
                padding: 14,
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
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                  style={{
                    padding: '8px 16px',
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
                    padding: '8px 14px',
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
              </div>
            </div>
          )}
        </div>

        {/* Trip list */}
        {localTrips.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, margin: '20px 0' }}>
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
                      gap: 12,
                      width: '100%',
                      padding: '11px 0',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--paper-2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon name="suitcase" size={16} stroke="var(--ink-2)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>
                        {trip.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                        {[
                          trip.destination,
                          dateRange,
                        ].filter(Boolean).join(' · ')}
                        {!trip.destination && !dateRange && (
                          <span style={{ fontStyle: 'italic' }}>No dates set</span>
                        )}
                      </div>
                    </div>
                    {isActive ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'oklch(0.45 0.10 252)',
                          background: 'oklch(0.92 0.05 252)',
                          padding: '2px 8px',
                          borderRadius: 20,
                          flexShrink: 0,
                        }}
                      >
                        planning
                      </span>
                    ) : (
                      <span style={{ opacity: 0, display: 'flex' }}>
                        <Icon name="check" size={16} stroke="oklch(0.55 0.16 145)" />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
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
