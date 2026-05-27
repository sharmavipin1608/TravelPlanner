import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DeleteConfirmModal } from '@/components/modals/delete-confirm-modal'
import type { Item } from '@/types'

vi.mock('@/components/ui/modal-base', () => ({
  ModalBase: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal">{children}</div>
  ),
}))

const baseItem: Item = {
  id: 'item-1',
  user_id: 'user-1',
  name: 'Senso-ji Temple',
  category: null,
  google_place_types: null,
  destination: 'Tokyo, Japan',
  lat: null,
  lng: null,
  google_place_id: null,
  notes: null,
  metadata: {},
  status: 'wishlist',
  created_at: '2026-01-01T00:00:00Z',
}

describe('DeleteConfirmModal', () => {
  it('renders the item name in the dialog', () => {
    const onConfirm = vi.fn(() => Promise.resolve())
    const onClose = vi.fn()

    render(
      <DeleteConfirmModal item={baseItem} onConfirm={onConfirm} onClose={onClose} />
    )

    expect(screen.getByText('Delete Senso-ji Temple?')).toBeTruthy()
  })

  it('Cancel button calls onClose', () => {
    const onConfirm = vi.fn(() => Promise.resolve())
    const onClose = vi.fn()

    render(
      <DeleteConfirmModal item={baseItem} onConfirm={onConfirm} onClose={onClose} />
    )

    screen.getByText('Cancel').click()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Delete button calls onConfirm and shows loading state while in flight', async () => {
    let resolveConfirm!: () => void
    const onConfirm = vi.fn(
      () => new Promise<void>(resolve => { resolveConfirm = resolve })
    )
    const onClose = vi.fn()

    render(
      <DeleteConfirmModal item={baseItem} onConfirm={onConfirm} onClose={onClose} />
    )

    // Before clicking: button says "Delete"
    expect(screen.getByText('Delete')).toBeTruthy()

    // Click Delete — triggers async handleConfirm
    await act(async () => {
      screen.getByText('Delete').click()
    })

    // onConfirm should have been called
    expect(onConfirm).toHaveBeenCalledTimes(1)

    // While the promise is still pending, button should show "Deleting…"
    expect(screen.getByText('Deleting…')).toBeTruthy()

    // Resolve the promise
    await act(async () => {
      resolveConfirm()
    })
  })

  it('after onConfirm resolves, loading state is reset (button text returns to "Delete")', async () => {
    let resolveConfirm!: () => void
    const onConfirm = vi.fn(
      () => new Promise<void>(resolve => { resolveConfirm = resolve })
    )
    const onClose = vi.fn()

    render(
      <DeleteConfirmModal item={baseItem} onConfirm={onConfirm} onClose={onClose} />
    )

    await act(async () => {
      screen.getByText('Delete').click()
    })

    // Still loading
    expect(screen.getByText('Deleting…')).toBeTruthy()

    // Resolve and wait for state update
    await act(async () => {
      resolveConfirm()
    })

    // Loading should be cleared
    expect(screen.getByText('Delete')).toBeTruthy()
    expect(screen.queryByText('Deleting…')).toBeNull()
  })

  it('renders item.destination when non-null', () => {
    const onConfirm = vi.fn(() => Promise.resolve())
    const onClose = vi.fn()

    render(
      <DeleteConfirmModal item={baseItem} onConfirm={onConfirm} onClose={onClose} />
    )

    expect(screen.getByText('Tokyo, Japan')).toBeTruthy()
  })

  it('does not render destination when item.destination is null', () => {
    const onConfirm = vi.fn(() => Promise.resolve())
    const onClose = vi.fn()
    const noDestItem: Item = { ...baseItem, destination: null }

    render(
      <DeleteConfirmModal item={noDestItem} onConfirm={onConfirm} onClose={onClose} />
    )

    expect(screen.queryByText('Tokyo, Japan')).toBeNull()
  })
})
