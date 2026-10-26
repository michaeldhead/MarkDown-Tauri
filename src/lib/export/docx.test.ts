import JSZip from 'jszip'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildDocxBlob } from './docx'

const MD = `# Title

Some **bold**, *italic*, ~~gone~~ and \`code\` text
on two lines.  
Hard break above. [safe](https://example.com/a) and [bad](javascript:alert1).
![pic](http://x/y.png) <span>raw</span>

## Second

### Third

###### Sixth

- one
  - nested
- [x] done
- [ ] todo

1. first
2. second

1. again

> quoted *text*
>
> > deeper

\`\`\`ts
const a = 1

const b = 2
\`\`\`

| A | B | C |
| - | - | - |
| 1 | 2 |
| 3 | 4 | 5 |

---

[ref][r]

[r]: https://example.org/r
`

let doc = ''
let styles = ''
let rels = ''

beforeAll(async () => {
  const blob = await buildDocxBlob(MD, 'T')
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  doc = await zip.file('word/document.xml')!.async('string')
  styles = await zip.file('word/styles.xml')!.async('string')
  rels = await zip.file('word/_rels/document.xml.rels')!.async('string')
})

describe('buildDocxBlob', () => {
  it('defines Heading1 with an outline level', () => {
    const m = styles.match(/<w:style [^>]*w:styleId="Heading1"[\s\S]*?<\/w:style>/)
    expect(m).not.toBeNull()
    expect(styles.match(/w:styleId="Heading1"/g)).toHaveLength(1)
    expect(m![0]).toContain('<w:outlineLvl w:val="0"/>')
  })

  it('uses numbering for lists and never types bullets', () => {
    expect(doc).toContain('<w:numPr>')
    for (const ch of ['•', '◦', '▪']) expect(doc).not.toContain(ch)
  })

  it('shades with clear fills', () => {
    const shd = doc.match(/<w:shd[^>]*>/g) ?? []
    expect(shd.length).toBeGreaterThan(0)
    for (const s of shd) expect(s).toContain('w:val="clear"')
    expect(doc).toContain('w:fill="1D4ED8"')
    expect(doc).toContain('w:fill="F3F4F6"')
  })

  it('keeps newlines out of text elements', () => {
    const texts = doc.match(/<w:t[ >][^<]*/g) ?? []
    expect(texts.length).toBeGreaterThan(0)
    for (const t of texts) expect(t).not.toMatch(/[\r\n]/)
  })

  it('sets page size, margins and the Arial default', () => {
    expect(doc).toContain('w:w="12240"')
    expect(doc).toContain('w:h="15840"')
    expect(doc).toContain('w:top="1440"')
    expect(styles).toContain('Arial')
  })

  it('writes ballot boxes for task items', () => {
    expect(doc).toContain('☑')
    expect(doc).toContain('☐')
  })

  it('allows only safe link URLs', () => {
    expect(doc).toContain('<w:hyperlink')
    expect(rels).toContain('https://example.com/a')
    expect(rels).toContain('https://example.org/r')
    expect(doc).not.toContain('javascript')
    expect(rels).not.toContain('javascript')
  })

  it('uses no percentage widths', () => {
    expect(doc).not.toContain('w:type="pct"')
  })
})
