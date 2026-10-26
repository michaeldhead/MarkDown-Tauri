import { describe, expect, it } from 'vitest'
import { deriveExportBaseName } from './fileName'

const PATH = 'C:\\docs\\notes.md'

describe('deriveExportBaseName safety', () => {
  it('removes bidi overrides', () => {
    expect(deriveExportBaseName('Report\u202Egpj.exe', PATH)).toBe('Reportgpj.exe')
    expect(deriveExportBaseName('a\u2066b\u2069', PATH)).toBe('ab')
  })

  it('removes zero-width, soft hyphen and BOM', () => {
    expect(deriveExportBaseName('\uFEFFMy\u200B Doc\u00AD', PATH)).toBe('My Doc')
  })

  it('falls back when a reserved word is hidden by an invisible character', () => {
    expect(deriveExportBaseName('C\u200BON', PATH)).toBe('notes')
  })

  it.each(['CON.txt', 'nul.md', 'COM1.pdf', 'LPT9.docx', 'aux.tar.gz', 'CON .txt'])(
    'falls back for %s',
    (title) => {
      expect(deriveExportBaseName(title, PATH)).toBe('notes')
    },
  )

  it('keeps non-reserved look-alikes', () => {
    expect(deriveExportBaseName('CONTENT', PATH)).toBe('CONTENT')
    expect(deriveExportBaseName('COM10', PATH)).toBe('COM10')
    expect(deriveExportBaseName('Console.log', PATH)).toBe('Console.log')
  })

  it('does not split a surrogate pair', () => {
    const r = deriveExportBaseName('a'.repeat(79) + '😀', PATH)
    expect(r).toBe('a'.repeat(79))
    expect(r).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
  })

  it('does not split a grapheme cluster', () => {
    expect(deriveExportBaseName('a'.repeat(78) + '🇬🇧', PATH)).toBe('a'.repeat(78))
    expect(deriveExportBaseName('a'.repeat(75) + '🇬🇧' + 'b', PATH)).toBe(
      'a'.repeat(75) + '🇬🇧' + 'b',
    )
    expect(deriveExportBaseName('a'.repeat(76) + '🇬🇧' + 'b', PATH)).toBe(
      'a'.repeat(76) + '🇬🇧',
    )
  })

  it('strips trailing dots and spaces exposed by the cut', () => {
    expect(deriveExportBaseName('a'.repeat(77) + '. . x', PATH)).toBe('a'.repeat(77))
  })
})
