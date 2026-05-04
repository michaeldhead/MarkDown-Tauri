import { useEffect, useRef, useState } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import PreviewPane from './PreviewPane'
import { applyTheme, type Theme } from '../lib/theme'
import { syncPreviewToEditorLine } from '../lib/scrollSync'

type PreviewUpdatePayload = {
  content: string
  filePath: string | null
  theme: Theme
  accentColor?: string
  topLine?: number
}

type PreviewScrollPayload = {
  topLine: number
}

// Delay between content state mutation and the post-render scroll re-apply.
// PreviewPane renders Markdown asynchronously (renderMarkdown returns a
// Promise), then commits via dangerouslySetInnerHTML. By the time this
// timer fires, the new HTML and its [data-source-line] anchors are
// laid out and getBoundingClientRect() returns meaningful values.
const RENDER_SETTLE_MS = 50

export default function PreviewWindowApp() {
  const [content, setContent] = useState<string>('')
  const previewRef = useRef<HTMLDivElement | null>(null)
  // Last known editor top line. Updated by every preview-scroll-update
  // and used after content re-renders to restore the user's view.
  const lastTopLineRef = useRef<number>(0)

  useEffect(() => {
    applyTheme('dark')

    let unlistenContent: (() => void) | null = null
    let unlistenScroll: (() => void) | null = null
    let cancelled = false

    void (async () => {
      try {
        unlistenContent = await listen<PreviewUpdatePayload>(
          'preview-content-update',
          (event) => {
            if (cancelled) return
            const payload = event.payload
            setContent(payload.content)
            if (payload.theme === 'dark' || payload.theme === 'ink') {
              applyTheme(payload.theme, payload.accentColor)
            }
            if (typeof payload.topLine === 'number') {
              lastTopLineRef.current = payload.topLine
            }
          },
        )

        unlistenScroll = await listen<PreviewScrollPayload>(
          'preview-scroll-update',
          (event) => {
            if (cancelled) return
            lastTopLineRef.current = event.payload.topLine
            const container = previewRef.current
            if (!container) return
            syncPreviewToEditorLine(container, event.payload.topLine)
          },
        )

        await emit('preview-window-ready', {})
      } catch (err) {
        console.error('[Preview window] Setup failed:', err)
      }
    })()

    return () => {
      cancelled = true
      if (unlistenContent) unlistenContent()
      if (unlistenScroll) unlistenScroll()
    }
  }, [])

  // After every content change PreviewPane re-runs its async render →
  // setHtml → dangerouslySetInnerHTML pipeline. Anchors don't exist
  // until that commits. Defer the re-apply by RENDER_SETTLE_MS so the
  // DOM has anchors with computed positions before we scroll.
  useEffect(() => {
    if (!content) return
    if (lastTopLineRef.current === 0) return
    const id = window.setTimeout(() => {
      const container = previewRef.current
      if (!container) return
      syncPreviewToEditorLine(container, lastTopLineRef.current)
    }, RENDER_SETTLE_MS)
    return () => window.clearTimeout(id)
  }, [content])

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <PreviewPane content={content} ref={previewRef} />
    </div>
  )
}
