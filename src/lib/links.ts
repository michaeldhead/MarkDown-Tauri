import { openUrl } from '@tauri-apps/plugin-opener'

export type LinkAction =
  | { kind: 'external'; url: string }
  | { kind: 'anchor'; id: string }
  | { kind: 'none' }

const EXTERNAL_RE = /^(https?|mailto):/i

/** Classify a raw `href` attribute (not the resolved `a.href` property). */
export function classifyHref(href: string | null): LinkAction {
  if (href === null) return { kind: 'none' }
  const value = href.trim()
  if (EXTERNAL_RE.test(value)) return { kind: 'external', url: value }
  if (value.startsWith('#') && value.length > 1) {
    const raw = value.slice(1)
    try {
      return { kind: 'anchor', id: decodeURIComponent(raw) }
    } catch {
      return { kind: 'anchor', id: raw }
    }
  }
  return { kind: 'none' }
}

/** GitHub-style heading slug. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
    .replace(/ /g, '-')
}

/** Slugs in document order; repeats get -1, -2, ... like GitHub. */
export function headingSlugs(texts: string[]): string[] {
  const seen = new Map<string, number>()
  return texts.map((text) => {
    const base = slugifyHeading(text)
    const count = seen.get(base)
    if (count === undefined) {
      seen.set(base, 1)
      return base
    }
    seen.set(base, count + 1)
    return `${base}-${count}`
  })
}

export async function openExternal(url: string): Promise<void> {
  try {
    await openUrl(url)
  } catch (err) {
    console.error('Failed to open link', err)
  }
}

type LinkEventLike = {
  type: string
  button: number
  target: unknown
  preventDefault(): void
}

type LinkEventOptions = {
  root: ParentNode
  scrollContainer: Element
  open?: (url: string) => void | Promise<void>
}

function findAnchorTarget(root: ParentNode, id: string): Element | null {
  const withId = Array.from(root.querySelectorAll('[id]'))
  const prefixed = `user-content-${id}`
  const byPrefixed = withId.find((el) => el.getAttribute('id') === prefixed)
  if (byPrefixed) return byPrefixed
  const exact = withId.find((el) => el.getAttribute('id') === id)
  if (exact) return exact
  const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  const slugs = headingSlugs(headings.map((h) => h.textContent ?? ''))
  const index = slugs.indexOf(id)
  return index >= 0 ? headings[index] : null
}

function scrollToAnchor(root: ParentNode, scrollContainer: Element, id: string): void {
  const target = findAnchorTarget(root, id)
  if (!target) return
  const doc = scrollContainer.ownerDocument
  const isDocScroller = scrollContainer === doc.scrollingElement || scrollContainer === doc.documentElement
  // The document's scrolling element reports a negative top when scrolled; the viewport top is 0.
  const containerTop = isDocScroller ? 0 : scrollContainer.getBoundingClientRect().top
  scrollContainer.scrollTop += target.getBoundingClientRect().top - containerTop
}

/** Returns true when the event was on a link (and has been prevented). */
export function handlePreviewLinkEvent(event: LinkEventLike, options: LinkEventOptions): boolean {
  const target = event.target as { closest?: (selector: string) => Element | null } | null
  const anchor = target && typeof target.closest === 'function' ? target.closest('a') : null
  if (!anchor) return false
  event.preventDefault()
  const isActivation =
    event.type === 'click' || (event.type === 'auxclick' && event.button === 1)
  if (!isActivation) return true
  const action = classifyHref(anchor.getAttribute('href'))
  if (action.kind === 'external') {
    void (options.open ?? openExternal)(action.url)
  } else if (action.kind === 'anchor') {
    scrollToAnchor(options.root, options.scrollContainer, action.id)
  }
  return true
}
