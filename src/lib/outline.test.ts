// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildTopology, countWords } from './outline'

describe('buildTopology', () => {
  it('returns headings with correct levels, text, and 1-based line numbers', () => {
    const md = ['# Title', '', 'Intro text.', '', '## Section', 'Body.', '### Sub', '###### Deep'].join('\n')
    const topology = buildTopology(md)
    expect(topology.map(({ level, text, lineNumber }) => ({ level, text, lineNumber }))).toEqual([
      { level: 1, text: 'Title', lineNumber: 1 },
      { level: 2, text: 'Section', lineNumber: 5 },
      { level: 3, text: 'Sub', lineNumber: 7 },
      { level: 6, text: 'Deep', lineNumber: 8 },
    ])
  })

  it('returns an empty array when there are no headings', () => {
    expect(buildTopology('just text\nmore text')).toEqual([])
  })

  it('ignores # lines inside ``` fenced code blocks', () => {
    const md = ['# Real', '```bash', '# a shell comment', '```', '## Also real'].join('\n')
    const topology = buildTopology(md)
    expect(topology.map((t) => [t.text, t.lineNumber])).toEqual([
      ['Real', 1],
      ['Also real', 5],
    ])
  })

  it('ignores # lines inside ~~~ fenced code blocks', () => {
    const md = ['# Real', '~~~', '# not a heading', '~~~', '## Also real'].join('\n')
    const topology = buildTopology(md)
    expect(topology.map((t) => [t.text, t.lineNumber])).toEqual([
      ['Real', 1],
      ['Also real', 5],
    ])
  })
})

describe('countWords', () => {
  it('returns 0 for empty and whitespace-only input', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n\t  ')).toBe(0)
  })

  it('counts whitespace-separated words', () => {
    expect(countWords('hello')).toBe(1)
    expect(countWords('hello world')).toBe(2)
    expect(countWords('  one\ttwo\n\nthree   four  ')).toBe(4)
  })
})
