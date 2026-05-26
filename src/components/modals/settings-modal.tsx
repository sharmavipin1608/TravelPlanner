'use client'

import { ModalBase } from '@/components/ui/modal-base'
import { useSettings } from '@/hooks/use-settings'
import type { Settings } from '@/hooks/use-settings'

interface SettingsModalProps {
  onClose: () => void
}

// SegmentedControl — shared between pin-style and density rows
interface SegmentedControlProps<T extends string> {
  value: T
  options: { label: string; value: T }[]
  onChange: (v: T) => void
}

function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid var(--paper-3)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-2)',
              transition: 'background 100ms',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ToggleSwitch
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
        height: 24,
        borderRadius: 12,
        background: checked ? 'oklch(0.55 0.16 145)' : 'var(--paper-3)',
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
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 150ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

const PIN_STYLE_OPTIONS: { label: string; value: Settings['pinStyle'] }[] = [
  { label: 'Teardrop', value: 'teardrop' },
  { label: 'Dot', value: 'dot' },
  { label: 'Ring', value: 'ring' },
]

const DENSITY_OPTIONS: { label: string; value: Settings['density'] }[] = [
  { label: 'Compact', value: 'compact' },
  { label: 'Regular', value: 'regular' },
  { label: 'Comfy', value: 'comfy' },
]

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 0',
  borderBottom: '1px solid var(--paper-2)',
  gap: 16,
}

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--ink)',
  fontWeight: 500,
  flexShrink: 0,
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, updateSetting] = useSettings()

  return (
    <ModalBase onClose={onClose}>
      <h2 style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: 'var(--ink)' }}>
        Settings
      </h2>

      {/* Pin style */}
      <div style={rowStyle}>
        <span style={labelStyle}>Pin style</span>
        <SegmentedControl<Settings['pinStyle']>
          value={settings.pinStyle}
          options={PIN_STYLE_OPTIONS}
          onChange={(v) => updateSetting('pinStyle', v)}
        />
      </div>

      {/* Density */}
      <div style={rowStyle}>
        <span style={labelStyle}>Density</span>
        <SegmentedControl<Settings['density']>
          value={settings.density}
          options={DENSITY_OPTIONS}
          onChange={(v) => updateSetting('density', v)}
        />
      </div>

      {/* Show legend */}
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={labelStyle}>Show legend</span>
        <ToggleSwitch
          checked={settings.showLegend}
          onChange={() => updateSetting('showLegend', !settings.showLegend)}
          label="Toggle show legend"
        />
      </div>
    </ModalBase>
  )
}
