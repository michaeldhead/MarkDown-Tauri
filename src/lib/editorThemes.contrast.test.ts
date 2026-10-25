import { describe, expect, it } from 'vitest'
import { tags } from '@lezer/highlight'
import type { HighlightStyle } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { ghsDarkHighlight, ghsDarkTheme, ghsInkHighlight, ghsInkTheme } from './editorThemes'

function themeRules(theme: Extension): string[] {
  const state = EditorState.create({ extensions: theme })
  return state.facet(EditorView.styleModule).flatMap((m) => m.getRules().split('\n'))
}

function colorIn(rule: string, prop: string): string {
  const match = rule.match(new RegExp(`(?:^|[{;\\s])${prop}:\\s*(#[0-9a-f]{6})`, 'i'))
  if (!match) throw new Error(`no ${prop} in ${rule}`)
  return match[1]
}

function editorColors(theme: Extension): { background: string; text: string } {
  const root = themeRules(theme).find((r) => /^\.\S+ \{/.test(r) && r.includes('background-color'))
  if (!root) throw new Error('no root editor rule')
  return { background: colorIn(root, 'background-color'), text: colorIn(root, 'color') }
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

// The .cm-activeLine rgba composited over the editor background, as a hex colour.
function activeLineColor(theme: Extension, background: string): string {
  const rule = themeRules(theme).find((r) => /\.cm-activeLine\s*\{/.test(r))
  const m = rule?.match(/background-color:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
  if (!m) throw new Error('no .cm-activeLine rgba rule')
  const fg = [m[1], m[2], m[3]].map(Number)
  const alpha = Number(m[4])
  const bg = rgb(background)
  const out = fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)))
  return '#' + out.map((c) => c.toString(16).padStart(2, '0')).join('')
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function markerColor(style: HighlightStyle): string {
  const cls = style.style([tags.processingInstruction])!
  const rule = style.module!.getRules().split('\n').find((r) => r.startsWith(`.${cls}{`) || r.startsWith(`.${cls} {`))
  return colorIn(rule ?? '', 'color')
}

describe.each([
  ['GHS Dark', ghsDarkHighlight, ghsDarkTheme, '#6e7681'],
  ['GHS Ink', ghsInkHighlight, ghsInkTheme, '#8c959f'],
])('%s marker contrast', (_name, style, theme, dotGrey) => {
  const { background, text } = editorColors(theme)
  const marker = markerColor(style)

  it('has at least 4.5:1 contrast against the editor background', () => {
    expect(contrast(marker, background)).toBeGreaterThanOrEqual(4.5)
  })

  it('has at least 4.5:1 contrast against the composited active line', () => {
    expect(contrast(marker, activeLineColor(theme, background))).toBeGreaterThanOrEqual(4.5)
  })

  it('stays clearly dimmer than body text', () => {
    expect(contrast(marker, background) * 1.5).toBeLessThan(contrast(text, background))
  })

  it('keeps the original grey on the trailing-space dots', () => {
    const rule = themeRules(theme).find((r) => r.includes('cm-trailingSpace'))
    expect(rule).toContain(dotGrey)
  })
})
