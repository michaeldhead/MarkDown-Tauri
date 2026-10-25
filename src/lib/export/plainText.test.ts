import { describe, expect, it } from 'vitest'
import { buildPlainText } from './plainText'

describe('buildPlainText', () => {
  it('returns empty string for empty or whitespace documents', () => {
    expect(buildPlainText('')).toBe('')
    expect(buildPlainText('  \n\n')).toBe('')
  })

  it('separates blocks with one blank line and ends with one newline', () => {
    expect(buildPlainText('a\n\n\n\nb\n\n\n')).toBe('a\n\nb\n')
  })

  it('drops heading markers', () => {
    expect(buildPlainText('## Head')).toBe('Head\n')
  })

  it('keeps soft and hard line breaks as newlines', () => {
    expect(buildPlainText('a\nb')).toBe('a\nb\n')
    expect(buildPlainText('a  \nb')).toBe('a\nb\n')
    expect(buildPlainText('a\\\nb')).toBe('a\nb\n')
  })

  it('removes inline formatting markers', () => {
    expect(buildPlainText('*e* **s** ~~d~~ `c`')).toBe('e s d c\n')
  })

  it('renders links as text (url)', () => {
    expect(buildPlainText('[t](https://x.com)')).toBe('t (https://x.com)\n')
  })

  it('renders a link once when text equals the URL', () => {
    expect(buildPlainText('<https://x.com> and https://y.com')).toBe(
      'https://x.com and https://y.com\n',
    )
  })

  it('resolves link references and drops definitions', () => {
    expect(buildPlainText('[t][r] [u][missing]\n\n[r]: https://x.com\n')).toBe(
      't (https://x.com) [u][missing]\n',
    )
  })

  it('renders images and image references', () => {
    expect(buildPlainText('![logo](a.png) ![ref][i]\n\n[i]: b.png')).toBe(
      '[image: logo] [image: ref]\n',
    )
  })

  it('strips HTML tags and keeps text', () => {
    expect(buildPlainText('<b>Bold</b> text')).toBe('Bold text\n')
  })

  it('keeps code block values verbatim without fences', () => {
    expect(buildPlainText('```js\nconst x = 1\n  y\n```')).toBe('const x = 1\n  y\n')
    expect(buildPlainText('    indented\n    code')).toBe('indented\ncode\n')
  })

  it('renders unordered lists', () => {
    expect(buildPlainText('* a\n* b')).toBe('- a\n- b\n')
  })

  it('renders ordered lists from the start value', () => {
    expect(buildPlainText('3. a\n4. b')).toBe('3. a\n4. b\n')
  })

  it('renders task items', () => {
    expect(buildPlainText('- [x] done\n- [ ] todo\n\n1. [ ] n')).toBe(
      '- [x] done\n- [ ] todo\n\n1. [ ] n\n',
    )
  })

  it('indents nested lists and multi-block items by two spaces', () => {
    expect(buildPlainText('- parent\n  - child\n- next')).toBe(
      '- parent\n  - child\n- next\n',
    )
    expect(buildPlainText('- a\n\n  b')).toBe('- a\n  b\n')
  })

  it('renders tables one row per line, tab separated', () => {
    expect(buildPlainText('| A | B |\n| - | - |\n| 1 | **2** |')).toBe('A\tB\n1\t2\n')
  })

  it('prefixes every blockquote line', () => {
    expect(buildPlainText('> line one\n> line two')).toBe('> line one\n> line two\n')
    expect(buildPlainText('> a\n>\n> b')).toBe('> a\n> \n> b\n')
    expect(buildPlainText('> > deep')).toBe('> > deep\n')
  })

  it('renders thematic breaks as ---', () => {
    expect(buildPlainText('a\n\n***\n\nb')).toBe('a\n\n---\n\nb\n')
  })

  it('renders other nodes as their children text', () => {
    expect(buildPlainText('x[^1]\n\n[^1]: note here')).toContain('note here')
  })

  it('matches the golden document', () => {
    const input = [
      '# Title',
      '',
      'Intro with **bold**, `code`, a [link](https://example.com) and ![logo](logo.png).',
      '',
      '- one',
      '- [x] done',
      '- [ ] todo',
      '',
      '1. first',
      '2. second',
      '',
      '> quoted line one',
      '> quoted line two',
      '',
      '```js',
      'const x = 1',
      '```',
      '',
      '| A | B |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '<b>Bold</b> text',
    ].join('\n')
    const expected = [
      'Title',
      '',
      'Intro with bold, code, a link (https://example.com) and [image: logo].',
      '',
      '- one',
      '- [x] done',
      '- [ ] todo',
      '',
      '1. first',
      '2. second',
      '',
      '> quoted line one',
      '> quoted line two',
      '',
      'const x = 1',
      '',
      'A\tB',
      '1\t2',
      '',
      'Bold text',
      '',
    ].join('\n')
    expect(buildPlainText(input)).toBe(expected)
  })
})
