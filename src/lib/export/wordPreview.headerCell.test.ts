import { describe, expect, it } from 'vitest'
import { buildWordPreviewHtml } from './wordPreview'

describe('Word preview header cells', () => {
  it('whitens links and code inside th', async () => {
    const html = await buildWordPreviewHtml('| [a](https://x.y) |\n| - |\n| b |', 'T')
    expect(html).toMatch(/th a[^{]*\{[^}]*color:\s*#ffffff/)
  })
})
