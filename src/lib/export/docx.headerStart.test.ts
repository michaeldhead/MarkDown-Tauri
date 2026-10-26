import JSZip from 'jszip'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildDocxBlob } from './docx'

const MD = `| [Head link](https://example.com/h) | \`hcode\` |
| - | - |
| [Body link](https://example.com/b) | \`bcode\` |

3. three
4. four

Between.

1. one
2. two

Between again.

3. again three

Last between.

2. outer

   5. inner
`

let doc = ''
let numbering = ''
let rels = ''

beforeAll(async () => {
  const blob = await buildDocxBlob(MD, 'T')
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  doc = await zip.file('word/document.xml')!.async('string')
  numbering = await zip.file('word/numbering.xml')!.async('string')
  rels = await zip.file('word/_rels/document.xml.rels')!.async('string')
})

function hyperlinkWith(text: string): string {
  const m = doc.match(/<w:hyperlink\b[^>]*>(?:(?!<\/w:hyperlink>)[\s\S])*<\/w:hyperlink>/g) ?? []
  const found = m.find((h) => h.includes(text))
  expect(found).toBeDefined()
  return found!
}

function runWith(text: string): string {
  const m = doc.match(/<w:r>(?:(?!<\/w:r>)[\s\S])*<\/w:r>/g) ?? []
  const found = m.find((r) => r.includes(text))
  expect(found).toBeDefined()
  return found!
}

function paraWith(text: string): string {
  const m = doc.match(/<w:p>(?:(?!<\/w:p>)[\s\S])*<\/w:p>/g) ?? []
  const found = m.find((p) => p.includes(`>${text}<`))
  expect(found).toBeDefined()
  return found!
}

function numId(text: string): string {
  return paraWith(text).match(/<w:numId w:val="(\d+)"/)![1]
}

function startOf(id: string, ilvl: number): string {
  const num = numbering.match(
    new RegExp(String.raw`<w:num w:numId="${id}"[^>]*>[\s\S]*?</w:num>`),
  )![0]
  return num.match(
    new RegExp(String.raw`w:ilvl="${ilvl}"[^>]*>\s*<w:startOverride w:val="(\d+)"`),
  )![1]
}

describe('header cells', () => {
  it('makes the header link a white hyperlink', () => {
    const h = hyperlinkWith('Head link')
    expect(h).toContain('<w:color w:val="FFFFFF"/>')
    expect(h).toContain('<w:b/>')
    expect(h).toMatch(/<w:u w:val="single"/)
    expect(h).not.toContain('1D4ED8')
    expect(rels).toContain('https://example.com/h')
  })

  it('makes header inline code white monospace', () => {
    const r = runWith('hcode')
    expect(r).not.toContain('991B1B')
    expect(r).toContain('FFFFFF')
    expect(r).toContain('Courier New')
  })

  it('leaves body cells unchanged', () => {
    expect(hyperlinkWith('Body link')).toContain('<w:color w:val="1D4ED8"/>')
    expect(runWith('bcode')).toContain('<w:color w:val="991B1B"/>')
  })
})

describe('ordered list starts', () => {
  it('honours start numbers', () => {
    expect(numId('three')).toBe(numId('four'))
    expect(startOf(numId('three'), 0)).toBe('3')
    expect(numId('one')).toBe(numId('two'))
    expect(numId('one')).not.toBe(numId('three'))
    expect(startOf(numId('one'), 0)).toBe('1')
  })

  it('restarts lists independently and keeps nested starts', () => {
    expect(numId('again three')).not.toBe(numId('three'))
    expect(startOf(numId('again three'), 0)).toBe('3')
    expect(startOf(numId('outer'), 0)).toBe('2')
    expect(paraWith('inner')).toContain('<w:ilvl w:val="1"/>')
    expect(numId('inner')).not.toBe(numId('outer'))
    expect(startOf(numId('inner'), 1)).toBe('5')
  })
})
