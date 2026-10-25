// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderMarkdown, wrapAsStyledHtml } from './preview'

describe('renderMarkdown', () => {
  it('renders a heading with data-source-line surviving rehype-sanitize', async () => {
    const html = await renderMarkdown('# H1')
    expect(html).toMatch(/<h1 data-source-line="1">H1<\/h1>/)
  })

  it('stamps data-source-line on every taggable block type', async () => {
    const md = [
      'A paragraph.', //            line 1
      '',
      '```js', //                   line 3
      'const x = 1',
      '```',
      '',
      '> A quote.', //              line 7
      '',
      '- item one', //              line 9
      '- item two',
      '',
      '1. first', //                line 12
      '',
      '| a | b |', //               line 14
      '| - | - |',
      '| 1 | 2 |',
    ].join('\n')
    const html = await renderMarkdown(md)
    expect(html).toMatch(/<p data-source-line="1">A paragraph\.<\/p>/)
    expect(html).toMatch(/<blockquote data-source-line="7">/)
    expect(html).toMatch(/<ul data-source-line="9">/)
    expect(html).toMatch(/<ol data-source-line="12">/)
    expect(html).toMatch(/<table data-source-line="14">/)
  })

  it('renders a GFM table', async () => {
    const html = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')
    expect(html).toContain('<table')
    expect(html).toContain('<th>a</th>')
    expect(html).toContain('<td>2</td>')
  })

  it('strips <script> tags from the input', async () => {
    const html = await renderMarkdown('Before\n\n<script>alert("x")</script>\n\nAfter')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(')
    expect(html).toContain('Before')
    expect(html).toContain('After')
  })

  it('strips javascript: URLs from links (sanitizer is active)', async () => {
    const html = await renderMarkdown('[click](javascript:alert(1))')
    expect(html).toContain('click')
    expect(html).not.toContain('javascript:')
  })
})

describe('wrapAsStyledHtml', () => {
  it('includes a <style> block and the escaped title', () => {
    const out = wrapAsStyledHtml('<p>body</p>', 'My <Doc>')
    expect(out).toMatch(/<style>[\s\S]+<\/style>/)
    expect(out).toContain('<title>My &lt;Doc&gt;</title>')
    expect(out).toContain('<p>body</p>')
  })

  it('is self-contained (no http:// or https:// URLs)', () => {
    const out = wrapAsStyledHtml('<p>body</p>', 'Title')
    expect(out).not.toMatch(/https?:\/\//)
  })
})
