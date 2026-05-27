import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Hoisted mock state — vi.hoisted runs before vi.mock factories
// ---------------------------------------------------------------------------
const { mockGetUser, mockSingle, mockSelect, mockEqUserId, mockEqId, mockUpdate, mockFrom } =
  vi.hoisted(() => {
    const mockSingle = vi.fn()
    const mockSelect = vi.fn()
    const mockEqUserId = vi.fn()
    const mockEqId = vi.fn()
    const mockUpdate = vi.fn()
    const mockFrom = vi.fn()
    const mockGetUser = vi.fn()
    return { mockGetUser, mockSingle, mockSelect, mockEqUserId, mockEqId, mockUpdate, mockFrom }
  })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

// ---------------------------------------------------------------------------
// Import route AFTER mocks are registered
// ---------------------------------------------------------------------------
import { PATCH } from '@/app/api/trips/[id]/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: Record<string, unknown> = { start_date: '2024-06-01' }): NextRequest {
  const req = new NextRequest('http://localhost/api/trips/trip-id-123', { method: 'PATCH' })
  req.json = vi.fn().mockResolvedValue(body)
  return req
}

function makeParams(id = 'trip-id-123'): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

const mockTrip = {
  id: 'trip-id-123',
  user_id: 'user-abc',
  name: 'Tokyo Trip',
  start_date: '2024-06-01',
  end_date: null,
  created_at: '2024-01-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PATCH /api/trips/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-wire the chainable query after clearAllMocks() wipes return values
    // Chain: from → update → eq(id) → eq(user_id) → select → single
    mockSingle.mockResolvedValue({ data: mockTrip, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockEqUserId.mockReturnValue({ select: mockSelect })
    mockEqId.mockReturnValue({ eq: mockEqUserId })
    mockUpdate.mockReturnValue({ eq: mockEqId })
    mockFrom.mockReturnValue({ update: mockUpdate })
  })

  it('returns 401 when getUser returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await PATCH(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('unauthorized')
  })

  it('returns 400 when body has neither start_date nor end_date', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })

    const response = await PATCH(makeRequest({ other_field: 'value' }), makeParams())
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('validation_error')
  })

  it('returns 404 when Supabase returns PGRST116 error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Row not found' },
    })

    const response = await PATCH(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('not_found')
  })

  it('returns 500 for other Supabase errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    })

    const response = await PATCH(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('db_error')
  })

  it('returns 200 { data: Trip, error: null } when update succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSingle.mockResolvedValue({ data: mockTrip, error: null })

    const response = await PATCH(makeRequest({ start_date: '2024-06-01' }), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.error).toBeNull()
    expect(body.data).toEqual(mockTrip)
  })

  it('passes correct trip id and user id to Supabase query', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } })
    mockSingle.mockResolvedValue({ data: { ...mockTrip, id: 'trip-999', user_id: 'user-xyz' }, error: null })

    await PATCH(makeRequest({ end_date: '2024-06-30' }), makeParams('trip-999'))

    expect(mockFrom).toHaveBeenCalledWith('trips')
    expect(mockUpdate).toHaveBeenCalledWith({ end_date: '2024-06-30' })
    expect(mockEqId).toHaveBeenCalledWith('id', 'trip-999')
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-xyz')
  })

  it('accepts body with only end_date', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSingle.mockResolvedValue({ data: { ...mockTrip, end_date: '2024-06-30' }, error: null })

    const response = await PATCH(makeRequest({ end_date: '2024-06-30' }), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.error).toBeNull()
    expect(body.data.end_date).toBe('2024-06-30')
  })

  it('accepts null values for start_date and end_date (date clearing)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSingle.mockResolvedValue({ data: { ...mockTrip, start_date: null, end_date: null }, error: null })

    const response = await PATCH(makeRequest({ start_date: null, end_date: null }), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ start_date: null, end_date: null })
  })
})
