import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Hoisted mock state — vi.hoisted runs before vi.mock factories
// ---------------------------------------------------------------------------
const { mockGetUser, mockSelect, mockEqUserId, mockEqId, mockDelete, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockEqUserId = vi.fn()
  const mockEqId = vi.fn()
  const mockDelete = vi.fn()
  const mockFrom = vi.fn()
  const mockGetUser = vi.fn()
  return { mockGetUser, mockSelect, mockEqUserId, mockEqId, mockDelete, mockFrom }
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
import { DELETE } from '@/app/api/items/[id]/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/items/test-id-123', { method: 'DELETE' })
}

function makeParams(id = 'test-id-123'): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DELETE /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-wire the chainable query after clearAllMocks() wipes return values
    mockSelect.mockResolvedValue({ data: [], error: null })
    mockEqUserId.mockReturnValue({ select: mockSelect })
    mockEqId.mockReturnValue({ eq: mockEqUserId })
    mockDelete.mockReturnValue({ eq: mockEqId })
    mockFrom.mockReturnValue({ delete: mockDelete })
  })

  it('returns 401 when getUser returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await DELETE(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('unauthorized')
  })

  it('returns 404 when delete returns an empty array (item not found or not owned)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSelect.mockResolvedValue({ data: [], error: null })

    const response = await DELETE(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('not_found')
  })

  it('returns 500 when Supabase returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSelect.mockResolvedValue({ data: null, error: { message: 'db failure', code: '42501' } })

    const response = await DELETE(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('db_error')
  })

  it('returns 200 { data: null, error: null } when delete succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockSelect.mockResolvedValue({
      data: [{ id: 'test-id-123', user_id: 'user-abc', name: 'Nobu Tokyo' }],
      error: null,
    })

    const response = await DELETE(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ data: null, error: null })
  })

  it('passes the correct item id and user id to the Supabase query', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-xyz' } } })
    mockSelect.mockResolvedValue({
      data: [{ id: 'item-999', user_id: 'user-xyz' }],
      error: null,
    })

    await DELETE(makeRequest(), makeParams('item-999'))

    expect(mockFrom).toHaveBeenCalledWith('items')
    expect(mockEqId).toHaveBeenCalledWith('id', 'item-999')
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-xyz')
  })
})
