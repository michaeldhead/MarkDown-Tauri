import { describe, expect, it } from 'vitest'
import { renderMarkdown, wrapAsCleanHtml, wrapAsStyledHtml } from '../preview'
import { buildHtmlClean, buildHtmlStyled } from './html'

const SAMPLE = '# Title\n\nSome **bold** text.\n\n- a\n- b\n\n```js\nconst x = 1\n```\n'

describe('HTML builders', () => {
  it('styled output equals wrapAsStyledHtml of renderMarkdown', async () => {
    expect(await buildHtmlStyled(SAMPLE, 'T')).toBe(
      wrapAsStyledHtml(await renderMarkdown(SAMPLE), 'T'),
    )
  })

  it('clean output equals wrapAsCleanHtml of renderMarkdown', async () => {
    expect(await buildHtmlClean(SAMPLE, 'T')).toBe(
      wrapAsCleanHtml(await renderMarkdown(SAMPLE), 'T'),
    )
  })

  it('sanitizes scripts and event handlers', async () => {
    const md = '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n'
    for (const out of [await buildHtmlStyled(md, 'T'), await buildHtmlClean(md, 'T')]) {
      expect(out).not.toContain('<script')
      expect(out).not.toContain('onerror')
    }
  })

  it('escapes the title', async () => {
    expect(await buildHtmlStyled('x', 'a <b> c')).toContain('<title>a &lt;b&gt; c</title>')
    expect(await buildHtmlClean('x', 'a <b> c')).toContain('<title>a &lt;b&gt; c</title>')
  })
})
