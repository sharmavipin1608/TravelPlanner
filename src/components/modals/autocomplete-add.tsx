'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ModalBase } from '@/components/ui/modal-base'
import { Icon } from '@/components/ui/icon'
import { mapPlaceType } from '@/lib/google-maps/place-type-map'
import type { Item, Category, Status } from '@/types'

// ─── Minimal Google Maps type shims (no @types/google.maps installed) ─────────

interface GMapsAutocompletePrediction {
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  description: string
}

interface GMapsPlaceResult {
  place_id?: string
  name?: string
  geometry?: {
    location?: {
      lat: () => number
      lng: () => number
    }
  }
  types?: string[]
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

interface GMapsAutocompleteService {
  getPlacePredictions: (
    request: { input: string },
    callback: (
      predictions: GMapsAutocompletePrediction[] | null,
      status: string
    ) => void
  ) => void
}

interface GMapsPlacesService {
  getDetails: (
    request: { placeId: string; fields: string[] },
    callback: (result: GMapsPlaceResult | null, status: string) => void
  ) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGoogleMaps(): any {
  return (window as { google?: { maps?: unknown } }).google?.maps
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}

function extractDestination(addressComponents: GMapsPlaceResult['address_components']): string | null {
  if (!addressComponents) return null
  const locality = addressComponents.find((c) => c.types.includes('locality'))
  const country = addressComponents.find((c) => c.types.includes('country'))
  if (locality && country) {
    return toTitleCase(`${locality.long_name}, ${country.long_name}`)
  }
  if (country) return toTitleCase(country.long_name)
  return null
}

// ─── Component props ──────────────────────────────────────────────────────────

interface AutocompleteAddProps {
  onClose: () => void
  onSave: (item: Item) => void
  manualMode?: boolean
}

// ─── Step 1: Search view ──────────────────────────────────────────────────────

interface SearchViewProps {
  onSelect: (prediction: GMapsAutocompletePrediction) => void
}

function SearchView({ onSelect }: SearchViewProps) {
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<GMapsAutocompletePrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const fetchPredictions = useCallback((input: string) => {
    const maps = getGoogleMaps()
    if (!maps?.places?.AutocompleteService) return
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: GMapsAutocompleteService = new (maps.places.AutocompleteService as any)()
    service.getPlacePredictions({ input }, (preds, status) => {
      setIsLoading(false)
      if (status === 'OK' && preds) {
        setPredictions(preds)
      } else {
        setPredictions([])
      }
    })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setPredictions([])
      return
    }
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Salmon header band */}
      <div
        style={{
          background: 'oklch(0.94 0.04 36)',
          padding: '20px 20px 16px',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <h2
          style={{
            margin: '0 0 4px',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--ink)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          Save a place
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'oklch(0.45 0.08 36)', fontFamily: 'var(--font-ui)' }}>
          Pulls name, coords, hours and type from Google.
        </p>
      </div>

      {/* Search input */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              position: 'absolute',
              left: 10,
              color: 'var(--ink-3)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Icon name="search" size={16} stroke="currentColor" />
          </span>
          <input
            ref={inputRef}
            className="input"
            value={query}
            onChange={handleChange}
            placeholder="Start typing a place name..."
            style={{ paddingLeft: 34, fontSize: 15 }}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Helper text box — shown when no query */}
      {!query.trim() && (
        <div style={{ padding: '0 20px 16px' }}>
          <div
            style={{
              background: 'var(--paper-2)',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 13,
              color: 'var(--ink-3)',
              fontFamily: 'var(--font-ui)',
              lineHeight: 1.5,
            }}
          >
            Type to search. We use Google Places — coords + opening hours come along for free.
          </div>
        </div>
      )}

      {/* Results */}
      {predictions.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 0 8px',
          }}
        >
          {predictions.map((p) => (
            <li key={p.place_id}>
              <button
                onClick={() => onSelect(p)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 20px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  fontFamily: 'var(--font-ui)',
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--paper-2)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                  {p.structured_formatting.main_text}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {p.structured_formatting.secondary_text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isLoading && (
        <p style={{ padding: '8px 20px', fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          Searching…
        </p>
      )}

      {!isLoading && query.trim() && predictions.length === 0 && (
        <p style={{ padding: '8px 20px', fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          No results found.
        </p>
      )}
    </div>
  )
}

// ─── Step 2: Detail form ──────────────────────────────────────────────────────

interface PlaceDetail {
  placeId: string
  name: string
  lat: number | null
  lng: number | null
  types: string[]
  destination: string | null
}

interface DetailFormProps {
  detail: PlaceDetail
  onBack: () => void
  onSave: (item: Item) => void
  onClose: () => void
  manualMode?: boolean
}

function DetailForm({ detail, onBack, onSave, onClose, manualMode = false }: DetailFormProps) {
  const suggestedCategory = mapPlaceType(detail.types)
  const [name, setName] = useState(detail.name)
  const [category, setCategory] = useState<Category | ''>(suggestedCategory ?? '')
  const [status, setStatus] = useState<Status>('wishlist')
  const [destination, setDestination] = useState(detail.destination ?? '')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const STATUS_OPTIONS: Status[] = ['wishlist', 'planned', 'visited']

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      const body = {
        name: name.trim(),
        category: category || undefined,
        google_place_types: detail.types.length > 0 ? detail.types : undefined,
        google_place_id: detail.placeId,
        destination: destination.trim() || undefined,
        lat: detail.lat ?? undefined,
        lng: detail.lng ?? undefined,
        status,
        notes: notes.trim() || undefined,
        metadata: {},
      }
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? 'Failed to save place.')
        setIsSaving(false)
        return
      }
      onSave(json.data as Item)
      onClose()
    } catch {
      setError('Network error — please try again.')
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      {manualMode ? (
        <div
          style={{
            background: 'oklch(0.94 0.03 252)',
            padding: '20px 20px 16px',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
              fontFamily: 'var(--font-serif)',
            }}
          >
            Add manually
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'oklch(0.45 0.07 252)', fontFamily: 'var(--font-ui)' }}>
            Name + category · no location data
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 20px',
            borderBottom: '1px solid var(--paper-2)',
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--ink-2)',
              borderRadius: 6,
            }}
            aria-label="Back to search"
          >
            <Icon name="arrow-left" size={18} stroke="currentColor" />
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--ink)',
              fontFamily: 'var(--font-ui)',
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {detail.name}
          </h2>
        </div>
      )}

      {/* Form body */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Name input — shown in manual mode */}
        {manualMode && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
                fontFamily: 'var(--font-ui)',
              }}
            >
              Name
            </label>
            <input
              className="input"
              placeholder="e.g. Ahiru Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Google place types pills */}
        {detail.types.length > 0 && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
                fontFamily: 'var(--font-ui)',
              }}
            >
              Place types
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {detail.types.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--paper-2)',
                    color: 'var(--ink-2)',
                    border: '1px solid var(--paper-3)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 2-column grid: category + status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Category */}
          <div>
            <label
              htmlFor="ac-category"
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
                fontFamily: 'var(--font-ui)',
              }}
            >
              Category
            </label>
            <select
              id="ac-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | '')}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">No category</option>
              <option value="place">Place</option>
              <option value="restaurant">Restaurant</option>
              <option value="accommodation">Accommodation</option>
              <option value="activity">Activity</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
                fontFamily: 'var(--font-ui)',
              }}
            >
              Status
            </span>
            <div
              style={{
                display: 'flex',
                borderRadius: 8,
                border: '1px solid var(--paper-3)',
                overflow: 'hidden',
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    border: 'none',
                    borderRight: s !== 'visited' ? '1px solid var(--paper-3)' : 'none',
                    background: status === s ? 'var(--ink)' : 'var(--paper-2)',
                    color: status === s ? 'var(--paper)' : 'var(--ink-2)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    transition: 'background 100ms, color 100ms',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label
            htmlFor="ac-destination"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 6,
              fontFamily: 'var(--font-ui)',
            }}
          >
            Destination
          </label>
          <input
            id="ac-destination"
            className="input"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Paris, France"
          />
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="ac-notes"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 6,
              fontFamily: 'var(--font-ui)',
            }}
          >
            Notes
          </label>
          <textarea
            id="ac-notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this place…"
            rows={3}
            style={{ resize: 'vertical', minHeight: 72 }}
          />
        </div>

        {/* Error */}
        {error && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'oklch(0.55 0.2 20)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {error}
          </p>
        )}

        {/* Save button */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={isSaving || (manualMode && !name.trim())}
          style={{ width: '100%', justifyContent: 'center', opacity: (isSaving || (manualMode && !name.trim())) ? 0.6 : 1 }}
        >
          {isSaving ? 'Saving…' : 'Save place'}
        </button>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function AutocompleteAdd({ onClose, onSave, manualMode = false }: AutocompleteAddProps) {
  const [selectedPrediction, setSelectedPrediction] =
    useState<GMapsAutocompletePrediction | null>(null)
  const [placeDetail, setPlaceDetail] = useState<PlaceDetail | null>(
    manualMode ? { placeId: '', name: '', lat: null, lng: null, types: [], destination: null } : null
  )
  const [isFetching, setIsFetching] = useState(false)
  const attributionRef = useRef<HTMLDivElement>(null)

  function handleSelectPrediction(prediction: GMapsAutocompletePrediction) {
    setSelectedPrediction(prediction)
    setIsFetching(true)

    const maps = getGoogleMaps()
    if (!maps?.places?.PlacesService) {
      // Fallback: no detail — use prediction data only
      setPlaceDetail({
        placeId: prediction.place_id,
        name: prediction.structured_formatting.main_text,
        lat: null,
        lng: null,
        types: [],
        destination: prediction.structured_formatting.secondary_text || null,
      })
      setIsFetching(false)
      return
    }

    // PlacesService requires an element for attributions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: GMapsPlacesService = new (maps.places.PlacesService as any)(
      attributionRef.current!
    )
    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'geometry', 'types', 'address_components'],
      },
      (result, status) => {
        setIsFetching(false)
        if (status === 'OK' && result) {
          const types = result.types ?? []
          const lat = result.geometry?.location?.lat() ?? null
          const lng = result.geometry?.location?.lng() ?? null
          const destination = extractDestination(result.address_components)
          setPlaceDetail({
            placeId: prediction.place_id,
            name: result.name ?? prediction.structured_formatting.main_text,
            lat,
            lng,
            types,
            destination,
          })
        } else {
          // Fallback on error
          setPlaceDetail({
            placeId: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            lat: null,
            lng: null,
            types: [],
            destination: prediction.structured_formatting.secondary_text || null,
          })
        }
      }
    )
  }

  function handleBack() {
    setSelectedPrediction(null)
    setPlaceDetail(null)
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      {/* Hidden attribution element required by PlacesService */}
      <div ref={attributionRef} style={{ display: 'none' }} aria-hidden="true" />

      {isFetching ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--ink-3)',
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
          }}
        >
          Loading place details…
        </div>
      ) : placeDetail ? (
        <DetailForm
          detail={placeDetail}
          onBack={handleBack}
          onSave={onSave}
          onClose={onClose}
          manualMode={manualMode}
        />
      ) : (
        <SearchView onSelect={handleSelectPrediction} />
      )}
    </ModalBase>
  )
}
