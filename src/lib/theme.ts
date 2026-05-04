export type Theme = 'dark' | 'ink'

export const THEME_TOKENS: Record<Theme, Record<string, string>> = {
  dark: {
    '--bg-primary': '#0d1117',
    '--bg-surface': '#161b22',
    '--bg-elevated': '#21262d',
    '--text-primary': '#e6edf3',
    '--text-muted': '#7d8590',
    '--accent': '#58a6ff',
    '--accent-hover': '#79c0ff',
    '--border': '#30363d',
    '--editor-bg': '#0d1117',
  },
  ink: {
    '--bg-primary': '#f6f8fa',
    '--bg-surface': '#eaeef2',
    '--bg-elevated': '#ffffff',
    '--text-primary': '#24292f',
    '--text-muted': '#57606a',
    '--accent': '#0550ae',
    '--accent-hover': '#033d8b',
    '--border': '#d0d7de',
    '--editor-bg': '#ffffff',
  },
}

export interface AccentPreset {
  name: string
  accent: string
  accentHover: string
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Blue', accent: '#58a6ff', accentHover: '#79c0ff' },
  { name: 'Teal', accent: '#4ec9b0', accentHover: '#6dd8c5' },
  { name: 'Green', accent: '#3fb950', accentHover: '#5dce6a' },
  { name: 'Orange', accent: '#f78166', accentHover: '#f99a85' },
  { name: 'Red', accent: '#ff7b72', accentHover: '#ff9c95' },
  { name: 'Purple', accent: '#d2a8ff', accentHover: '#dfc0ff' },
  { name: 'Gold', accent: '#d4a843', accentHover: '#dfbe6a' },
  { name: 'Pink', accent: '#f778ba', accentHover: '#f993c7' },
  { name: 'Indigo', accent: '#818cf8', accentHover: '#9ba6f9' },
  { name: 'Silver', accent: '#8b949e', accentHover: '#a3adb5' },
]

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].accent

export interface FontFamilyPreset {
  name: string
  value: string
}

export const FONT_FAMILY_PRESETS: FontFamilyPreset[] = [
  { name: 'Cascadia Code', value: "'Cascadia Code', Consolas, monospace" },
  { name: 'Consolas', value: "Consolas, 'Courier New', monospace" },
  { name: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { name: 'Arial', value: "Arial, Helvetica, sans-serif" },
]

export const DEFAULT_FONT_FAMILY = FONT_FAMILY_PRESETS[0].value
export const DEFAULT_FONT_SIZE = 14
export const FONT_SIZE_MIN = 12
export const FONT_SIZE_MAX = 20

/**
 * Applies a theme + optional accent override to `<html>`. Always writes the
 * full token block before the accent override so toggling accent without
 * changing theme still produces the right base palette.
 */
export function applyTheme(theme: Theme, accentColor?: string): void {
  const root = document.documentElement
  const tokens = THEME_TOKENS[theme]
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value)
  }
  if (accentColor) {
    const preset = ACCENT_PRESETS.find((p) => p.accent === accentColor)
    root.style.setProperty('--accent', accentColor)
    root.style.setProperty('--accent-hover', preset?.accentHover ?? accentColor)
  }
  root.classList.remove('dark', 'ink')
  root.classList.add(theme)
}
