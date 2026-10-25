import { describe, expect, it, vi } from 'vitest'
import { exportHtmlClean, exportHtmlStyled, exportPlainText } from './exporters'
import { buildHtmlClean, buildHtmlStyled } from './html'
import { buildPlainText } from './plainText'

const MD = '# My Doc\n\nHello *there*.\n'
const doc = { markdown: MD, filePath: 'C:\\x\\file.md' }
const HTML_FILTER = [{ name: 'HTML', extensions: ['html', 'htm'] }]
const TEXT_FILTER = [{ name: 'Text', extensions: ['txt'] }]

describe.each([
  ['exportHtmlStyled', exportHtmlStyled, buildHtmlStyled],
  ['exportHtmlClean', exportHtmlClean, buildHtmlClean],
])('%s', (_name, run, realBuild) => {
  it('builds once and saves the result', async () => {
    const build = vi.fn(async () => 'SENTINEL')
    const save = vi.fn(async () => {})
    await run(doc, { build, save })
    expect(build).toHaveBeenCalledTimes(1)
    expect(build).toHaveBeenCalledWith(MD, 'My Doc')
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('My Doc.html', HTML_FILTER, 'SENTINEL')
  })

  it('defaults to the real builder', async () => {
    const save = vi.fn(async (_n: string, _f: unknown, _t: string) => {})
    await run(doc, { save })
    expect(save.mock.calls[0][2]).toBe(await realBuild(MD, 'My Doc'))
  })
})

describe('exportPlainText', () => {
  it('builds once and saves the result', async () => {
    const build = vi.fn(() => 'SENTINEL')
    const save = vi.fn(async () => {})
    await exportPlainText(doc, { build, save })
    expect(build).toHaveBeenCalledTimes(1)
    expect(build).toHaveBeenCalledWith(MD)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('My Doc.txt', TEXT_FILTER, 'SENTINEL')
  })

  it('defaults to the real builder', async () => {
    const save = vi.fn(async (_n: string, _f: unknown, _t: string) => {})
    await exportPlainText(doc, { save })
    expect(save.mock.calls[0][2]).toBe(buildPlainText(MD))
  })

  it('propagates errors', async () => {
    const save = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(exportPlainText(doc, { save })).rejects.toThrow('boom')
  })
})
