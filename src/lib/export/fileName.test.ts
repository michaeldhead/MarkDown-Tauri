import { describe, expect, it } from 'vitest'
import { deriveExportBaseName } from './fileName'

const PATH = 'C:\\docs\\notes.md'

describe('deriveExportBaseName', () => {
  it('strips heading and emphasis syntax', () => {
    expect(deriveExportBaseName('# Hello *World*', PATH)).toBe('Hello World')
  })

  it('uses the first non-blank line and keeps link text and code', () => {
    expect(deriveExportBaseName('\n\n  ## [Link](http://x) and `code`', PATH)).toBe(
      'Link and code',
    )
  })

  it('removes forbidden characters', () => {
    expect(deriveExportBaseName('Title: a/b <c>?', PATH)).toBe('Title ab c')
  })

  it('strips trailing dots', () => {
    expect(deriveExportBaseName('Report...', PATH)).toBe('Report')
  })

  it('caps at 80 characters with no trailing dot or space', () => {
    const name = deriveExportBaseName(`${'a'.repeat(79)}. ${'b'.repeat(120)}`, PATH)
    expect(name.length).toBeLessThanOrEqual(80)
    expect(name).toMatch(/[^. ]$/)
  })

  it('removes control characters', () => {
    expect(deriveExportBaseName('ab\u0001cd\u007fe', PATH)).toBe('abcde')
  })

  it('falls back to the file name for reserved names', () => {
    expect(deriveExportBaseName('CON', PATH)).toBe('notes')
    expect(deriveExportBaseName('com1', PATH)).toBe('notes')
  })

  it('falls back for a code fence first line', () => {
    expect(deriveExportBaseName('```js\ncode', PATH)).toBe('notes')
  })

  it('falls back for a line that reduces to nothing', () => {
    expect(deriveExportBaseName('# \nSecond line', PATH)).toBe('notes')
    expect(deriveExportBaseName('---\nText', PATH)).toBe('notes')
  })

  it('falls back for empty documents', () => {
    expect(deriveExportBaseName('', PATH)).toBe('notes')
    expect(deriveExportBaseName('', null)).toBe('untitled')
  })
})
