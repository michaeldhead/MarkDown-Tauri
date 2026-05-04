import {
  ACCENT_PRESETS,
  FONT_FAMILY_PRESETS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
} from '../../lib/theme'

export type Theme = 'dark' | 'ink'
export type ViewMode = 'write' | 'split' | 'preview'

type SettingsPanelProps = {
  theme: Theme
  onThemeChange: (theme: Theme) => void
  defaultViewMode: ViewMode
  onDefaultViewModeChange: (mode: ViewMode) => void
  onRegisterFileAssociation: () => void
  autoSaveInterval: number
  onAutoSaveIntervalChange: (v: number) => void
  accentColor: string
  onAccentColorChange: (color: string) => void
  editorFontSize: number
  onEditorFontSizeChange: (size: number) => void
  editorFontFamily: string
  onEditorFontFamilyChange: (family: string) => void
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
  marginTop: 8,
}

const groupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
}

const btnStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '5px 14px',
  borderRadius: 999,
  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
  background: isActive ? 'var(--accent)' : 'var(--bg-elevated)',
  color: isActive ? 'var(--bg-primary)' : 'var(--text-primary)',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: isActive ? 600 : 400,
  transition: 'background 0.1s, color 0.1s, border-color 0.1s',
})

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'GHS Dark' },
  { value: 'ink', label: 'GHS Ink' },
]

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'write', label: 'Write' },
  { value: 'split', label: 'Split' },
  { value: 'preview', label: 'Preview' },
]

const AUTOSAVE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
]

export default function SettingsPanel({
  theme,
  onThemeChange,
  defaultViewMode,
  onDefaultViewModeChange,
  onRegisterFileAssociation,
  autoSaveInterval,
  onAutoSaveIntervalChange,
  accentColor,
  onAccentColorChange,
  editorFontSize,
  onEditorFontSizeChange,
  editorFontFamily,
  onEditorFontFamilyChange,
}: SettingsPanelProps) {
  const autoSaveLabel =
    AUTOSAVE_OPTIONS.find((o) => o.value === autoSaveInterval)?.label ?? 'Off'
  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={sectionLabelStyle}>Theme</div>
      <div style={groupStyle}>
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onThemeChange(opt.value)}
            style={btnStyle(theme === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ ...sectionLabelStyle, marginTop: 20 }}>Accent Color</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {ACCENT_PRESETS.map((preset) => {
          const isSelected = accentColor === preset.accent
          return (
            <button
              key={preset.accent}
              type="button"
              title={preset.name}
              aria-label={preset.name}
              onClick={() => onAccentColorChange(preset.accent)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: preset.accent,
                border: isSelected
                  ? '2px solid var(--text-primary)'
                  : '2px solid transparent',
                outline: isSelected ? `2px solid ${preset.accent}` : 'none',
                outlineOffset: 1,
                cursor: 'pointer',
                padding: 0,
                transition: 'outline 0.1s, border 0.1s',
              }}
            />
          )
        })}
      </div>

      <div style={{ ...sectionLabelStyle, marginTop: 20 }}>Font Size</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <input
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          value={editorFontSize}
          onChange={(e) => onEditorFontSizeChange(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: 'var(--accent)',
            cursor: 'pointer',
          }}
        />
        <span
          style={{
            fontFamily: "'Cascadia Code', Consolas, monospace",
            fontSize: 13,
            color: 'var(--text-primary)',
            minWidth: 24,
            textAlign: 'right',
          }}
        >
          {editorFontSize}
        </span>
      </div>

      <div style={{ ...sectionLabelStyle, marginTop: 20 }}>Editor Font</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        {FONT_FAMILY_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onEditorFontFamilyChange(preset.value)}
            style={{
              ...btnStyle(editorFontFamily === preset.value),
              fontFamily: preset.value,
              textAlign: 'left',
              borderRadius: 4,
              padding: '5px 12px',
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div style={{ ...sectionLabelStyle, marginTop: 20 }}>Default View Mode</div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 6,
          fontStyle: 'italic',
        }}
      >
        Applied on next launch.
      </div>
      <div style={groupStyle}>
        {VIEW_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onDefaultViewModeChange(opt.value)}
            style={btnStyle(defaultViewMode === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ ...sectionLabelStyle, marginTop: 20 }}>Auto-Save</div>
      <div style={groupStyle}>
        {AUTOSAVE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onAutoSaveIntervalChange(opt.value)}
            style={btnStyle(autoSaveInterval === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 4,
          fontStyle: 'italic',
        }}
      >
        {autoSaveInterval === 0
          ? 'Auto-save is off. Use Ctrl+S to save manually.'
          : `Auto-saves every ${autoSaveLabel} when a file is open and has unsaved changes.`}
      </div>

      <div style={{ ...sectionLabelStyle, marginTop: 20 }}>File Association</div>
      <button type="button" onClick={onRegisterFileAssociation} style={btnStyle(false)}>
        Register for .md files
      </button>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 4,
          fontStyle: 'italic',
        }}
      >
        Opens .md files in this app when double-clicked in Explorer.
      </div>
    </div>
  )
}
