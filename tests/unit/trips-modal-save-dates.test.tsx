import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { TripsModal } from '@/components/modals/trips-modal'
import type { Trip } from '@/types'

// ---------------------------------------------------------------------------
// Mock heavy UI dependencies
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/modal-base', () => ({
  ModalBase: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal">{children}</div>
  ),
}))

vi.mock('@/components/ui/icon', () => ({
  Icon: () => <span data-testid="icon" />,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const baseTrip: Trip = {
  id: 'trip-1',
  user_id: 'user-1',
  name: 'Tokyo May 2026',
  destination: 'Tokyo, Japan',
  start_date: '2026-05-01',
  end_date: '2026-05-15',
  created_at: '2026-01-01T00:00:00Z',
}

function makeProps(overrides?: Partial<typeof baseTrip>) {
  const trip = { ...baseTrip, ...overrides }
  return {
    trips: [trip],
    activeTripId: trip.id,
    onActivate: vi.fn(),
    onClose: vi.fn(),
    onTripsUpdated: vi.fn(),
    items: [],
    tripItemIds: new Set<string>(),
  }
}

// ---------------------------------------------------------------------------
// Helper: open edit mode for the only trip row
// ---------------------------------------------------------------------------
function openEditMode() {
  // The edit pencil icon is rendered as a role="button" with title="Edit dates"
  const editBtn = screen.getByTitle('Edit dates')
  fireEvent.click(editBtn)
}

function clickSave() {
  const saveBtn = screen.getByText('Save')
  fireEvent.click(saveBtn)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TripsModal — handleSaveDates error handling', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows error message when PATCH returns a non-ok response (e.g. 500)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: null, error: { code: 'db_error', message: 'Internal server error' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const props = makeProps()
    render(<TripsModal {...props} />)

    openEditMode()

    await act(async () => {
      clickSave()
    })

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/trips/trip-1',
      expect.objectContaining({ method: 'PATCH' })
    )

    // Error message must be visible
    expect(screen.getByText('Failed to save dates. Please try again.')).toBeTruthy()

    // editingId should NOT have been cleared — inline editor stays open so user can retry
    expect(screen.getByText('Save')).toBeTruthy()

    // onTripsUpdated should NOT have been called
    expect(props.onTripsUpdated).not.toHaveBeenCalled()
  })

  it('shows error message when PATCH returns 404', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: null, error: { code: 'not_found', message: 'Trip not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const props = makeProps()
    render(<TripsModal {...props} />)

    openEditMode()

    await act(async () => {
      clickSave()
    })

    expect(screen.getByText('Failed to save dates. Please try again.')).toBeTruthy()
    expect(props.onTripsUpdated).not.toHaveBeenCalled()
  })

  it('shows error message when fetch throws (network error)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const props = makeProps()
    render(<TripsModal {...props} />)

    openEditMode()

    await act(async () => {
      clickSave()
    })

    expect(screen.getByText('Network error. Please try again.')).toBeTruthy()
    expect(props.onTripsUpdated).not.toHaveBeenCalled()
  })

  it('clears edit mode and calls onTripsUpdated on successful PATCH', async () => {
    const updatedTrip: Trip = { ...baseTrip, start_date: '2026-06-01', end_date: '2026-06-14' }

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: updatedTrip, error: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const props = makeProps()
    render(<TripsModal {...props} />)

    openEditMode()

    await act(async () => {
      clickSave()
    })

    // No error message
    expect(screen.queryByText('Failed to save dates. Please try again.')).toBeNull()
    expect(screen.queryByText('Network error. Please try again.')).toBeNull()

    // Edit mode should be closed (Save button gone)
    expect(screen.queryByText('Save')).toBeNull()

    // onTripsUpdated called with updated trip list
    expect(props.onTripsUpdated).toHaveBeenCalledOnce()
    expect(props.onTripsUpdated).toHaveBeenCalledWith([updatedTrip])
  })

  it('sends start_date and end_date as null when draft fields are empty', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { ...baseTrip, start_date: null, end_date: null }, error: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    // Render a trip with no dates so draft defaults to empty strings
    const props = makeProps({ start_date: null, end_date: null })
    render(<TripsModal {...props} />)

    openEditMode()

    await act(async () => {
      clickSave()
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/trips/trip-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ start_date: null, end_date: null }),
      })
    )
  })
})
