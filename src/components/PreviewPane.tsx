import { forwardRef, useEffect, useRef, useState } from 'react'
import { renderMarkdown } from '../lib/preview'

type PreviewPaneProps = {
  content: string
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  onHeadingClick?: (line: number) => void
  activeSourceLine?: number | null
}

const HEADING_TAG_RE = /^H[1-6]$/

const PreviewPane = forwardRef<HTMLDivElement, PreviewPaneProps>(function PreviewPane(
  { content, onScroll, onHeadingClick, activeSourceLine },
  ref,
) {
  const [html, setHtml] = useState<string>('')
  const localRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    renderMarkdown(content)
      .then((out) => {
        if (!cancelled) setHtml(out)
      })
      .catch((err) => {
        if (!cancelled) setHtml(`<pre>Preview error: ${String(err)}</pre>`)
      })
    return () => {
      cancelled = true
    }
  }, [content])

  // Apply / move the .preview-heading-active class to the heading whose
  // source line matches the editor's active section. Re-runs when html
  // changes so newly rendered headings get the class.
  useEffect(() => {
    const container = localRef.current
    if (!container) return
    container.querySelectorAll('.preview-heading-active').forEach((el) => {
      el.classList.remove('preview-heading-active')
    })
    if (activeSourceLine == null) return
    const target = container.querySelector(`[data-source-line="${activeSourceLine}"]`)
    if (target) target.classList.add('preview-heading-active')
  }, [activeSourceLine, html])

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onHeadingClick) return
    let target: HTMLElement | null = e.target as HTMLElement | null
    while (target && target !== e.currentTarget) {
      if (HEADING_TAG_RE.test(target.tagName)) {
        const raw = target.getAttribute('data-source-line')
        if (raw) {
          const lineNum = parseInt(raw, 10)
          if (!Number.isNaN(lineNum)) onHeadingClick(lineNum)
        }
        return
      }
      target = target.parentElement
    }
  }

  return (
    <div
      ref={setRefs}
      onScroll={onScroll}
      onClick={handleClick}
      className="preview-content"
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px 32px',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

export default PreviewPane
