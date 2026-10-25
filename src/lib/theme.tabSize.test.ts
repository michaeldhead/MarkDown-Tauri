// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DEFAULT_TAB_SIZE, normalizeTabSize } from './theme'

describe('normalizeTabSize', () => {
  it('accepts 2 and 4', () => {
    expect(normalizeTabSize(2)).toBe(2)
    expect(normalizeTabSize(4)).toBe(4)
  })

  it('falls back to 2 for anything else', () => {
    for (const v of [undefined, null, 3, 8, 0, '4', NaN]) {
      expect(normalizeTabSize(v)).toBe(2)
    }
  })

  it('defaults to 2', () => {
    expect(DEFAULT_TAB_SIZE).toBe(2)
  })
})
