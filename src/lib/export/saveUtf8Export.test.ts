import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}))

import { saveUtf8Export } from './save'

const FILTERS = [{ name: 'Text', extensions: ['txt'] }]

describe('saveUtf8Export', () => {
  beforeEach(() => invoke.mockReset())

  it('only opens the dialog when cancelled', async () => {
    invoke.mockResolvedValueOnce(null)
    await saveUtf8Export('a.txt', FILTERS, 'hi')
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke.mock.calls[0][0]).toBe('save_dialog')
  })

  it('writes UTF-8 bytes as a number array to the chosen path', async () => {
    invoke.mockResolvedValueOnce('C:\out\a.txt').mockResolvedValueOnce(null)
    await saveUtf8Export('a.txt', FILTERS, 'hé €')
    expect(invoke).toHaveBeenNthCalledWith(2, 'write_file_bytes', {
      path: 'C:\out\a.txt',
      bytes: [104, 195, 169, 32, 226, 130, 172],
    })
  })

  it('never invokes write_file', async () => {
    invoke.mockResolvedValueOnce('C:\out\a.txt').mockResolvedValueOnce(null)
    await saveUtf8Export('a.txt', FILTERS, 'x')
    expect(invoke.mock.calls.map((c) => c[0])).not.toContain('write_file')
  })
})
