'use client'

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 80,
  right: 16,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  background: 'rgba(250,246,236,.82)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
  overflow: 'hidden',
}

const btnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 20,
  fontWeight: 300,
  color: 'var(--ink)',
  lineHeight: 1,
}

type TpMap = { zoomIn: () => void; zoomOut: () => void }

export function ZoomControls() {
  function handleZoomIn() {
    ;(window as unknown as { __tpMap?: TpMap }).__tpMap?.zoomIn()
  }

  function handleZoomOut() {
    ;(window as unknown as { __tpMap?: TpMap }).__tpMap?.zoomOut()
  }

  return (
    <div style={containerStyle}>
      <button style={btnStyle} onClick={handleZoomIn} type="button" aria-label="Zoom in">
        +
      </button>
      <button style={btnStyle} onClick={handleZoomOut} type="button" aria-label="Zoom out">
        −
      </button>
    </div>
  )
}
