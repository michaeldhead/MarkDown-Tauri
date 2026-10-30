import { describe, expect, it, vi } from 'vitest'
import { classifyHref, handlePreviewLinkEvent, headingSlugs, slugifyHeading } from './links'

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }))

describe('classifyHref', () => {
  it('detects external links', () => {
    expect(classifyHref('https://example.com/')).toEqual({ kind: 'external', url: 'https://example.com/' })
    expect(classifyHref('HTTP://example.com')).toEqual({ kind: 'external', url: 'HTTP://example.com' })
    expect(classifyHref('mailto:a@b.c')).toEqual({ kind: 'external', url: 'mailto:a@b.c' })
    expect(classifyHref('  https://x.org  ')).toEqual({ kind: 'external', url: 'https://x.org' })
  })
  it('detects anchors', () => {
    expect(classifyHref('#section')).toEqual({ kind: 'anchor', id: 'section' })
    expect(classifyHref(' #section ')).toEqual({ kind: 'anchor', id: 'section' })
    expect(classifyHref('#caf%C3%A9')).toEqual({ kind: 'anchor', id: 'café' })
    expect(classifyHref('#bad%E0%A4%A')).toEqual({ kind: 'anchor', id: 'bad%E0%A4%A' })
  })
  it('ignores everything else', () => {
    for (const h of [
      '#', '', null, 'other.md', './x.md', 'javascript:alert(1)', 'file:///C:/x',
      'data:text/html,x', 'blob:x', 'tauri://localhost', 'irc://x',
    ]) {
      expect(classifyHref(h)).toEqual({ kind: 'none' })
    }
  })
})

describe('slugifyHeading', () => {
  it('slugifies GitHub style', () => {
    expect(slugifyHeading('Hello, World!')).toBe('hello-world')
    expect(slugifyHeading('Section Two')).toBe('section-two')
    expect(slugifyHeading('Step 2: Go')).toBe('step-2-go')
    expect(slugifyHeading('Café Über')).toBe('café-über')
    expect(slugifyHeading('a  b')).toBe('a--b')
  })
})

describe('headingSlugs', () => {
  it('numbers duplicates', () => {
    expect(headingSlugs(['Foo', 'Bar', 'foo', 'Foo'])).toEqual(['foo', 'bar', 'foo-1', 'foo-2'])
  })
})

describe('handlePreviewLinkEvent', () => {
  const make = (type: string, button: number, href: string | null, hasAnchor = true) => {
    const preventDefault = vi.fn()
    const anchor = { getAttribute: () => href }
    const target = { closest: () => (hasAnchor ? anchor : null) }
    const open = vi.fn()
    const options = { root: {} as ParentNode, scrollContainer: {} as Element, open }
    return { event: { type, button, target, preventDefault }, preventDefault, open, options }
  }

  it('opens external links for click, ctrl click and middle auxclick', () => {
    for (const [type, button] of [['click', 0], ['click', 0], ['auxclick', 1]] as const) {
      const t = make(type, button, 'https://example.com/')
      expect(handlePreviewLinkEvent(t.event, t.options)).toBe(true)
      expect(t.preventDefault).toHaveBeenCalledOnce()
      expect(t.open).toHaveBeenCalledOnce()
      expect(t.open).toHaveBeenCalledWith('https://example.com/')
    }
  })
  it('prevents but does not open javascript: or relative links', () => {
    for (const href of ['javascript:alert(1)', 'other.md']) {
      const t = make('click', 0, href)
      expect(handlePreviewLinkEvent(t.event, t.options)).toBe(true)
      expect(t.preventDefault).toHaveBeenCalledOnce()
      expect(t.open).not.toHaveBeenCalled()
    }
  })
  it('prevents but does not open for right auxclick and middle mousedown', () => {
    for (const [type, button] of [['auxclick', 2], ['mousedown', 1]] as const) {
      const t = make(type, button, 'https://example.com/')
      expect(handlePreviewLinkEvent(t.event, t.options)).toBe(true)
      expect(t.preventDefault).toHaveBeenCalledOnce()
      expect(t.open).not.toHaveBeenCalled()
    }
  })
  it('does nothing without an anchor', () => {
    const t = make('click', 0, null, false)
    expect(handlePreviewLinkEvent(t.event, t.options)).toBe(false)
    expect(t.preventDefault).not.toHaveBeenCalled()
    expect(t.open).not.toHaveBeenCalled()
  })
})
