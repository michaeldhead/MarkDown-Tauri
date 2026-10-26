import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import * as lib from '@react-pdf/renderer'
import { buildPdfBlob, buildPdfDocument, type PdfComponents } from './pdf'
import { parseMarkdown } from './parse'

const components: PdfComponents = lib

const FULL = [
  '# Title',
  '',
  '## Sub',
  '',
  'Some **bold**, *italic* and `code` with [a link](https://example.com).',
  '',
  '```ts',
  'const a = 1',
  '```',
  '',
  '> quoted *text*',
  '',
  '- one',
  '- two',
  '  - nested',
  '',
  '3. three',
  '4. four',
  '',
  '- [x] done',
  '- [ ] todo',
  '',
  '---',
  '',
  '| A | B |',
  '|---|---|',
  '| 1 | 2 |',
  '',
  '![alt text](https://example.com/x.png)',
  '',
].join('\n')

function el(n: ReactNode): ReactElement | null {
  return isValidElement(n) ? (n as ReactElement) : null
}

function all(node: ReactNode, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    node.forEach((c) => all(c, out))
    return out
  }
  const e = el(node)
  if (!e) return out
  out.push(e)
  all((e.props as { children?: ReactNode }).children, out)
  return out
}

function textDescendants(e: ReactElement): ReactElement[] {
  return all((e.props as { children?: ReactNode }).children).filter(
    (c) => c.type === components.Text,
  )
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const e = el(node)
  return e ? textOf((e.props as { children?: ReactNode }).children) : ''
}

describe('buildPdfBlob', () => {
  it('produces a PDF for a document using every block type', async () => {
    const blob = await buildPdfBlob(FULL, 'Doc')
    const head = new Uint8Array(await blob.arrayBuffer()).slice(0, 4)
    expect(new TextDecoder().decode(head)).toBe('%PDF')
  })

  it('logs no key warning for adjacent formatting runs', async () => {
    const md = '**bold**_italic_~~strike~~'
    const para = parseMarkdown(md).children[0]
    expect('children' in para && para.children.map((c) => c.type)).toEqual([
      'strong',
      'emphasis',
      'delete',
    ])
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await buildPdfBlob(md, 'T')
    const msgs = [...err.mock.calls, ...warn.mock.calls].map((c) => c.join(' '))
    expect(msgs.filter((m) => /key/i.test(m))).toEqual([])
  })
})

describe('buildPdfDocument', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses a flat bold-oblique run for nested strong and emphasis', () => {
    const tree = buildPdfDocument('***both*** and *it*', 'T', components)
    const texts = all(tree).filter((e) => e.type === components.Text)
    const fam = (e: ReactElement) =>
      (e.props as { style?: { fontFamily?: string } }).style?.fontFamily
    expect(texts.some((e) => fam(e) === 'Helvetica-BoldOblique')).toBe(true)
    // Run elements (those that set a font family) never contain another Text.
    for (const r of texts.filter((e) => fam(e))) {
      expect(textDescendants(r)).toEqual([])
    }
  })

  it('links only allow-listed schemes', () => {
    const links = (md: string) =>
      all(buildPdfDocument(md, 'T', components)).filter(
        (e) => e.type === components.Link,
      )
    expect(links('[x](javascript:alert(1))')).toHaveLength(0)
    expect(links('[x](file:///etc/passwd)')).toHaveLength(0)
    const ok = links('[x](https://example.com)')
    expect(ok).toHaveLength(1)
    expect((ok[0].props as { src: string }).src).toBe('https://example.com')
  })

  it('draws task boxes', () => {
    const t = textOf(buildPdfDocument('- [x] a\n- [ ] b\n', 'T', components))
    expect(t).toContain('☑')
    expect(t).toContain('☐')
  })

  it('renders heading runs bold', () => {
    const tree = buildPdfDocument('# One\n\n## Two *em*\n', 'T', components)
    const fams = all(tree)
      .filter((e) => e.type === components.Text)
      .map((e) => (e.props as { style?: { fontFamily?: string } }).style?.fontFamily)
    expect(fams).toContain('Helvetica-BoldOblique')
    expect(fams.filter((f) => f === 'Helvetica-Bold')).toHaveLength(4)
    expect(fams).not.toContain('Helvetica')
  })
})
