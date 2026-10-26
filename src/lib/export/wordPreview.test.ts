import { describe, expect, it } from 'vitest'
import { buildWordPreviewHtml } from './wordPreview'

describe('buildWordPreviewHtml', () => {
  it('returns a full document with the body text and Arial', async () => {
    const html = await buildWordPreviewHtml('# Hello\n\nSome body text', 'T')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('</html>')
    expect(html).toContain('Hello')
    expect(html).toContain('Some body text')
    expect(html).toContain('Arial')
  })

  it('drops scripts from the Markdown', async () => {
    const html = await buildWordPreviewHtml(
      '# T\n\n<script>window.pwned=1</script>',
      'T',
    )
    expect(html).not.toContain('<script')
  })

  it('escapes the title', async () => {
    const html = await buildWordPreviewHtml('x', 'a<b>')
    expect(html).toContain('<title>a&lt;b&gt;</title>')
  })
})
