// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isThemePreference, resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('keeps explicit preferences regardless of the OS', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('ink', true)).toBe('ink')
    expect(resolveTheme('ink', false)).toBe('ink')
  })

  it('maps auto to dark when the OS prefers dark and ink otherwise', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('ink')
  })
})

describe('isThemePreference', () => {
  it('accepts dark, ink and auto', () => {
    for (const v of ['dark', 'ink', 'auto']) expect(isThemePreference(v)).toBe(true)
  })

  it('rejects other values', () => {
    for (const v of [undefined, null, 'light', '', 1]) expect(isThemePreference(v)).toBe(false)
  })
})
