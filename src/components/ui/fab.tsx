'use client'

import { Icon } from './icon'

interface FabProps {
  isOpen: boolean
  onClick: () => void
}

export function Fab({ isOpen, onClick }: FabProps) {
  return (
    <button
      className={`tp-fab${isOpen ? ' is-open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Add a place'}
    >
      <Icon name="plus" size={22} stroke="currentColor" strokeWidth={2.2} />
    </button>
  )
}
