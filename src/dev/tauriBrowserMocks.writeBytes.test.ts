import { describe, expect, it, vi } from 'vitest'
import { handleMockCommand } from './tauriBrowserMocks'

describe('handleMockCommand write_file_bytes', () => {
  it('returns null without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(handleMockCommand('write_file_bytes')).toBeNull()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
