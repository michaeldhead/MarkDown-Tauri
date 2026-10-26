import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PREVIEW_DEBOUNCE_MS,
  createDebouncer,
  createPreviewCache,
} from './previewCache'

describe('createPreviewCache', () => {
  it('returns the value for the same content', () => {
    const c = createPreviewCache<string>()
    c.set('text', 'a', 'A')
    expect(c.get('text', 'a')).toBe('A')
  })

  it('misses when the content changed', () => {
    const c = createPreviewCache<string>()
    c.set('text', 'a', 'A')
    expect(c.get('text', 'b')).toBeUndefined()
  })

  it('keeps formats isolated', () => {
    const c = createPreviewCache<string>()
    c.set('text', 'a', 'T')
    c.set('pdf', 'b', 'P')
    expect(c.get('text', 'a')).toBe('T')
    expect(c.get('pdf', 'b')).toBe('P')
    expect(c.get('pdf', 'a')).toBeUndefined()
    expect(c.get('docx', 'a')).toBeUndefined()
  })

  it('clear empties the cache', () => {
    const c = createPreviewCache<string>()
    c.set('text', 'a', 'T')
    c.clear()
    expect(c.get('text', 'a')).toBeUndefined()
  })
})

describe('createDebouncer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs once after the quiet period', () => {
    const fn = vi.fn()
    const d = createDebouncer(PREVIEW_DEBOUNCE_MS)
    d.schedule(fn)
    vi.advanceTimersByTime(799)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('is reset by a new schedule', () => {
    const first = vi.fn()
    const second = vi.fn()
    const d = createDebouncer(800)
    d.schedule(first)
    vi.advanceTimersByTime(500)
    d.schedule(second)
    vi.advanceTimersByTime(500)
    expect(second).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('cancel drops the pending call', () => {
    const fn = vi.fn()
    const d = createDebouncer(800)
    d.schedule(fn)
    d.cancel()
    vi.advanceTimersByTime(2000)
    expect(fn).not.toHaveBeenCalled()
  })
})
