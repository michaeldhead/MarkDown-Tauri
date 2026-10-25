// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './preview'

describe('renderMarkdown fenced code anchors', () => {
  const md = [
    'Para', //          line 1
    '',
    '```js', //         line 3
    'const x = 1',
    '```',
    '',
    'More text.', //    line 7
    '',
    '```', //           line 9
    'plain',
    '```',
    '',
  ].join('\n')

  it('puts data-source-line on <pre> and keeps language class on <code>', async () => {
    const html = await renderMarkdown(md)
    expect(html).toMatch(/<pre data-source-line="3"><code class="hljs language-js">/)
  })

  it('gives a second fence without a language its own line number', async () => {
    const html = await renderMarkdown(md)
    expect(html).toMatch(/<pre data-source-line="9"><code/)
  })

  it('leaves no data-source-line on <code>', async () => {
    const html = await renderMarkdown(md)
    expect(html).not.toMatch(/<code[^>]*data-source-line/)
  })
})
