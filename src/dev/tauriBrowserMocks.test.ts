import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleMockCommand, shouldInstallBrowserMocks } from './tauriBrowserMocks'

describe('shouldInstallBrowserMocks', () => {
  it('installs in dev without Tauri internals', () => {
    expect(shouldInstallBrowserMocks(true, {})).toBe(true)
  })
  it('does not install outside dev', () => {
    expect(shouldInstallBrowserMocks(false, {})).toBe(false)
  })
  it('does not install when Tauri internals exist', () => {
    expect(shouldInstallBrowserMocks(true, { __TAURI_INTERNALS__: {} })).toBe(false)
  })
})

describe('handleMockCommand', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns an empty [value, exists] tuple for store get', () => {
    expect(handleMockCommand('plugin:store|get')).toEqual([null, false])
  })
  it('returns a numeric resource id for store load', () => {
    expect(typeof handleMockCommand('plugin:store|load')).toBe('number')
  })
  it('reports the file association as registered', () => {
    expect(handleMockCommand('check_file_association')).toBe(true)
  })
  it('handles window commands silently', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(handleMockCommand('plugin:window|set_title')).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })
  it('warns once and returns null for unknown commands', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(handleMockCommand('does_not_exist')).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('does_not_exist')
  })
})
