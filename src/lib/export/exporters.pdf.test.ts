import { describe, expect, it, vi } from 'vitest'
import { exportToPdf } from './exporters'

const MD = '# My Doc\n\nHello.\n'
const doc = { markdown: MD, filePath: 'C:\\x\\file.md' }

describe('exportToPdf', () => {
  it('builds once and saves the blob bytes', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])])
    const build = vi.fn(async () => blob)
    const save = vi.fn(async () => {})
    await exportToPdf(doc, { build, save })
    expect(build).toHaveBeenCalledTimes(1)
    expect(build).toHaveBeenCalledWith(MD, 'My Doc')
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(
      'My Doc.pdf',
      [{ name: 'PDF', extensions: ['pdf'] }],
      new Uint8Array([1, 2, 3, 4]),
    )
    const bytes = (save.mock.calls[0] as unknown[])[2]
    expect(bytes).toBeInstanceOf(Uint8Array)
  })

  it('propagates save errors', async () => {
    const build = vi.fn(async () => new Blob(['x']))
    const save = vi.fn(async () => {
      throw new Error('disk full')
    })
    await expect(exportToPdf(doc, { build, save })).rejects.toThrow('disk full')
  })
})
