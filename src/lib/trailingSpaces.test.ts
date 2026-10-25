import { describe, expect, it } from 'vitest'
import { trailingSpaceRun } from './trailingSpaces'

describe('trailingSpaceRun', () => {
  it('returns null when there is no run of 2+ trailing spaces', () => {
    for (const text of ['', 'abc', 'abc ', 'a  b', 'abc\t']) {
      expect(trailingSpaceRun(text)).toBeNull()
    }
  })

  it('returns the run offsets', () => {
    expect(trailingSpaceRun('abc  ')).toEqual({ from: 3, to: 5 })
    expect(trailingSpaceRun('abc     ')).toEqual({ from: 3, to: 8 })
    expect(trailingSpaceRun('    ')).toEqual({ from: 0, to: 4 })
  })

  it('stops the run at a tab', () => {
    expect(trailingSpaceRun('abc \t  ')).toEqual({ from: 5, to: 7 })
  })
})
