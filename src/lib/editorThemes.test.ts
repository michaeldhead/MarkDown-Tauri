import { describe, expect, it } from 'vitest'
import { markdown } from '@codemirror/lang-markdown'
import { highlightTree, tags } from '@lezer/highlight'
import type { HighlightStyle } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { ghsDarkHighlight, ghsDarkTheme, ghsInkHighlight, ghsInkTheme } from './editorThemes'

const sample = `# Title

## Sub

*em* _u_ **b** \`code\`

> quote

- item
1. one
`

const markers = ['#', '##', '*', '_', '**', '`', '>', '-', '1.']
const contentWords = ['Title', 'Sub', 'em', 'u', 'b', 'code', 'quote']

interface Span {
  text: string
  classes: string
}

function collectSpans(style: HighlightStyle): Span[] {
  const tree = markdown().language.parser.parse(sample)
  const spans: Span[] = []
  highlightTree(tree, style, (from, to, classes) => {
    spans.push({ text: sample.slice(from, to), classes })
  })
  return spans
}

function ruleFor(style: HighlightStyle, cls: string): { index: number; text: string } {
  const rules = style.module!.getRules().split('\n')
  const index = rules.findIndex((r) => r.startsWith(`.${cls}{`) || r.startsWith(`.${cls} {`))
  return { index, text: rules[index] ?? '' }
}

function colorIn(rule: string, prop: string): string {
  const match = rule.match(new RegExp(`(?:^|[{;\\s])${prop}:\\s*(#[0-9a-f]{6})`, 'i'))
  if (!match) throw new Error(`no ${prop} in ${rule}`)
  return match[1]
}

// The editor's root rule ('&' in EditorView.theme) carries its background and text colour.
function editorColors(theme: Extension): { background: string; text: string } {
  const state = EditorState.create({ extensions: theme })
  const rules = state
    .facet(EditorView.styleModule)
    .flatMap((m) => m.getRules().split('\n'))
  const root = rules.find((r) => /^\.\S+ \{/.test(r) && r.includes('background-color'))
  if (!root) throw new Error('no root editor rule')
  return { background: colorIn(root, 'background-color'), text: colorIn(root, 'color') }
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// WCAG contrast ratio, 1 (none) to 21 (black on white).
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([
  ['GHS Dark', ghsDarkHighlight, ghsDarkTheme],
  ['GHS Ink', ghsInkHighlight, ghsInkTheme],
])('%s marker dimming', (_name, style, theme) => {
  const markerClass = style.style([tags.processingInstruction])!
  const spans = collectSpans(style)
  const markerSpans = spans.filter((s) => markers.includes(s.text.trim()))
  const hasMarker = (s: Span) => s.classes.split(' ').includes(markerClass)

  it('applies the marker class to every marker span', () => {
    for (const m of markers) {
      expect(spans.some((s) => s.text === m)).toBe(true)
    }
    for (const s of markerSpans) expect(hasMarker(s)).toBe(true)
  })

  it('does not apply the marker class to content spans', () => {
    const content = spans.filter((s) => contentWords.some((w) => s.text.includes(w)))
    expect(content.length).toBeGreaterThan(0)
    for (const s of content) expect(hasMarker(s)).toBe(false)
  })

  it('sets only the colour', () => {
    const { text } = ruleFor(style, markerClass)
    expect(text).toMatch(/\bcolor:/)
    expect(text).not.toContain('font-size')
    expect(text).not.toContain('font-weight')
    expect(text).not.toContain('font-style')
  })

  it('makes markers visibly dimmer than content text against the editor background', () => {
    const { background, text } = editorColors(theme)
    const marker = colorIn(ruleFor(style, markerClass).text, 'color')
    // "Visibly" dimmer: markers need clearly less contrast than content text, not just a hair less.
    expect(contrast(marker, background) * 1.5).toBeLessThan(contrast(text, background))
  })

  it('places the marker rule after every other class on marker spans', () => {
    const marker = ruleFor(style, markerClass)
    expect(marker.index).toBeGreaterThanOrEqual(0)
    for (const s of markerSpans) {
      for (const cls of s.classes.split(' ')) {
        if (cls === markerClass) continue
        const other = ruleFor(style, cls)
        expect(other.index).toBeGreaterThanOrEqual(0)
        expect(marker.index).toBeGreaterThan(other.index)
      }
    }
  })
})
