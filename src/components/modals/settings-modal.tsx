'use client'

import { ModalBase } from '@/components/ui/modal-base'
import type { Settings } from '@/hooks/use-settings'

interface SettingsModalProps {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onClose: () => void
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: { label: string; value: T; icon?: string }[]
  onChange: (v: T) => void
}

function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--paper-2)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              background: active ? 'var(--paper)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 100ms',
              fontFamily: 'var(--font-ui)',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.icon && <span style={{ fontSize: 14 }}>{opt.icon}</span>}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  label: string
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        position: 'relative',
        width: 44,
        height: 26,
        borderRadius: 13,
        background: checked ? 'oklch(0.50 0.14 36)' : 'var(--paper-3)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 150ms',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 150ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}

const MAP_STYLE_OPTIONS: { value: Settings['mapStyle']; label: string; provider: string; swatch: string[] }[] = [
  { value: 'paper',    label: 'Paper',     provider: 'Default',      swatch: ['#e8e0d0', '#d4c9b0', '#c8b88a'] },
  { value: 'cool',     label: 'Cool',      provider: 'Light',        swatch: ['#dde8f0', '#c5d8e8', '#b0c8d8'] },
  { value: 'dusk',     label: 'Dusk',      provider: 'Dark',         swatch: ['#2a2e3a', '#363c4e', '#404662'] },
  { value: 'satellite',label: 'Satellite', provider: 'Esri imagery', swatch: ['#3a5a3a', '#2d4a2d', '#4a6a4a'] },
]

const PIN_STYLE_OPTIONS: { label: string; value: Settings['pinStyle']; icon: string }[] = [
  { label: 'Pin', value: 'teardrop', icon: '📍' },
  { label: 'Dot', value: 'dot', icon: '🔴' },
  { label: 'Ring', value: 'ring', icon: '⭕' },
]

const DENSITY_OPTIONS: { label: string; value: Settings['density'] }[] = [
  { label: 'Compact', value: 'compact' },
  { label: 'Regular', value: 'regular' },
  { label: 'Comfy',   value: 'comfy' },
]

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  marginBottom: 10,
  fontFamily: 'var(--font-ui)',
}

export function SettingsModal({ settings, updateSetting, onClose }: SettingsModalProps) {
  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <div style={{ padding: '28px 28px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
            Settings
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>
            Customize how Wayfare looks and feels.
          </p>
        </div>

        {/* Map Style */}
        <div style={{ marginBottom: 24 }}>
          <p style={sectionLabel}>Map Style</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {MAP_STYLE_OPTIONS.map((opt) => {
              const active = settings.mapStyle === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => updateSetting('mapStyle', opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: active ? '2px solid oklch(0.50 0.14 36)' : '1.5px solid var(--paper-3)',
                    background: active ? 'var(--paper)' : 'var(--paper)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-ui)',
                    transition: 'border-color 100ms',
                  }}
                >
                  {/* Swatch */}
                  <span
                    style={{
                      width: 36,
                      height: 28,
                      borderRadius: 6,
                      flexShrink: 0,
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    {opt.swatch.map((c, i) => (
                      <span key={i} style={{ flex: 1, background: c }} />
                    ))}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{opt.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{opt.provider}</span>
                  </span>
                  {active && (
                    <span style={{ marginLeft: 'auto', color: 'oklch(0.50 0.14 36)', fontSize: 16 }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--paper-2)', marginBottom: 20 }} />

        {/* Pin Style */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Pin Style</p>
          <SegmentedControl<Settings['pinStyle']>
            value={settings.pinStyle}
            options={PIN_STYLE_OPTIONS}
            onChange={(v) => updateSetting('pinStyle', v)}
          />
        </div>

        <div style={{ borderTop: '1px solid var(--paper-2)', marginBottom: 20 }} />

        {/* Density */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Density</p>
          <SegmentedControl<Settings['density']>
            value={settings.density}
            options={DENSITY_OPTIONS}
            onChange={(v) => updateSetting('density', v)}
          />
        </div>

        <div style={{ borderTop: '1px solid var(--paper-2)', marginBottom: 20 }} />

        {/* Show legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>
              Show legend
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>
              Category color key, bottom-left of map.
            </p>
          </div>
          <ToggleSwitch
            checked={settings.showLegend}
            onChange={() => updateSetting('showLegend', !settings.showLegend)}
            label="Toggle show legend"
          />
        </div>
      </div>
    </ModalBase>
  )
}
