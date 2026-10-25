import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { invoke } from '@tauri-apps/api/core'
import { saveBinaryExport, saveTextExport } from './save'

const mockInvoke = vi.mocked(invoke)
const filters = [{ name: 'X', extensions: ['x'] }]

beforeEach(() => {
  mockInvoke.mockReset()
})

describe('saveBinaryExport', () => {
  it('does not write when the dialog is cancelled', async () => {
    mockInvoke.mockResolvedValueOnce(null)
    await saveBinaryExport('a.bin', filters, new Uint8Array([1]))
    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(mockInvoke).toHaveBeenCalledWith('save_dialog', {
      defaultName: 'a.bin',
      filters,
    })
  })

  it('writes a plain number array to the chosen path', async () => {
    mockInvoke.mockResolvedValueOnce('C:\\out\\a.bin').mockResolvedValueOnce(null)
    await saveBinaryExport('a.bin', filters, new Uint8Array([0, 7, 255]))
    expect(mockInvoke).toHaveBeenLastCalledWith('write_file_bytes', {
      path: 'C:\\out\\a.bin',
      bytes: [0, 7, 255],
    })
    const sent = mockInvoke.mock.calls[1][1] as { bytes: unknown }
    expect(Array.isArray(sent.bytes)).toBe(true)
  })
})

describe('saveTextExport', () => {
  it('does not write when the dialog is cancelled', async () => {
    mockInvoke.mockResolvedValueOnce(null)
    await saveTextExport('a.txt', filters, 'hi')
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('writes the text to the chosen path', async () => {
    mockInvoke.mockResolvedValueOnce('C:\\out\\a.txt').mockResolvedValueOnce(null)
    await saveTextExport('a.txt', filters, 'hi')
    expect(mockInvoke).toHaveBeenLastCalledWith('write_file', {
      path: 'C:\\out\\a.txt',
      content: 'hi',
    })
  })
})
