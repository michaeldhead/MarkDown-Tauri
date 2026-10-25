import { describe, expect, it } from 'vitest'
import { markdown } from '@codemirror/lang-markdown'
import { highlightTree, tags } from '@lezer/highlight'
import type { HighlightStyle } from '@codemirror/language'
import { ghsDarkHighlight, ghsInkHighlight } from './editorThemes'

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

describe.each([
  ['GHS Dark', ghsDarkHighlight, '#6e7681'],
  ['GHS Ink', ghsInkHighlight, '#8c959f'],
])('%s marker dimming', (_name, style, color) => {
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
    expect(text).toContain(color)
    expect(text).not.toContain('font-size')
    expect(text).not.toContain('font-weight')
    expect(text).not.toContain('font-style')
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
