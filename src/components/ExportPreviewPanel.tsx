import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { buildHtmlClean, buildHtmlStyled } from '../lib/export/html'
import { buildPlainText } from '../lib/export/plainText'
import { deriveExportBaseName } from '../lib/export/fileName'
import { buildPdfBlob } from '../lib/export/pdf'
import { buildWordPreviewHtml } from '../lib/export/wordPreview'
import {
  PREVIEW_DEBOUNCE_MS,
  PREVIEW_FORMATS,
  createDebouncer,
  createPreviewCache,
  type PreviewFormat,
} from '../lib/export/previewCache'

type ExportPreviewPanelProps = {
  content: string
  filePath: string | null
  onClose: () => void
  onExport: (format: PreviewFormat) => void
  otherModalOpen: boolean
}

type Built = string | Blob

const WORD_NOTE =
  'Approximate preview - actual Word formatting may differ slightly from what is shown here.'

async function build(
  format: PreviewFormat,
  content: string,
  title: string,
): Promise<Built> {
  switch (format) {
    case 'pdf':
      return buildPdfBlob(content, title)
    case 'docx':
      return buildWordPreviewHtml(content, title)
    case 'html-styled':
      return buildHtmlStyled(content, title)
    case 'html-clean':
      return buildHtmlClean(content, title)
    case 'text':
      return buildPlainText(content)
  }
}

const frameStyle = {
  flex: 1,
  width: '100%',
  border: 'none',
  background: '#ffffff',
} as const

export default function ExportPreviewPanel({
  content,
  filePath,
  onClose,
  onExport,
  otherModalOpen,
}: ExportPreviewPanelProps) {
  const [active, setActive] = useState<PreviewFormat>('pdf')
  // `value` is the text, srcDoc or object URL to display for `format`.
  const [shown, setShown] = useState<{ format: PreviewFormat; value: string } | null>(null)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheRef = useRef(createPreviewCache<Built>())
  const debouncerRef = useRef(createDebouncer(PREVIEW_DEBOUNCE_MS))
  const mountedRef = useRef(false)
  const activeRef = useRef(active)
  const contentRef = useRef(content)
  const filePathRef = useRef(filePath)
  const tokenRef = useRef(0)
  const requestedRef = useRef<{ format: PreviewFormat; content: string } | null>(null)
  const urlRef = useRef<string | null>(null)
  const onCloseRef = useRef(onClose)
  const otherModalRef = useRef(otherModalOpen)
  activeRef.current = active
  contentRef.current = content
  filePathRef.current = filePath
  onCloseRef.current = onClose
  otherModalRef.current = otherModalOpen

  const revokeUrl = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])

  const display = useCallback(
    (format: PreviewFormat, value: Built) => {
      if (typeof value === 'string') {
        setShown({ format, value })
        return
      }
      revokeUrl()
      urlRef.current = URL.createObjectURL(value)
      setShown({ format, value: urlRef.current })
    },
    [revokeUrl],
  )

  const load = useCallback(
    async (format: PreviewFormat, text: string) => {
      const token = ++tokenRef.current
      requestedRef.current = { format, content: text }
      setError(null)
      const cached = cacheRef.current.get(format, text)
      if (cached !== undefined) {
        setBuilding(false)
        display(format, cached)
        return
      }
      setBuilding(true)
      const isStale = () =>
        !mountedRef.current ||
        activeRef.current !== format ||
        tokenRef.current !== token
      try {
        const title = deriveExportBaseName(text, filePathRef.current)
        const built = await build(format, text, title)
        cacheRef.current.set(format, text, built)
        if (isStale()) return
        display(format, built)
        setBuilding(false)
      } catch (err) {
        console.error('Preview build failed:', err)
        if (isStale()) return
        setError('Preview failed. Try editing the document or switching tabs.')
        setBuilding(false)
      }
    },
    [display],
  )

  // Open or tab switch: show from cache or build immediately.
  useEffect(() => {
    mountedRef.current = true
    if (active !== 'pdf') revokeUrl()
    void load(active, contentRef.current)
  }, [active, load, revokeUrl])

  // Editing: rebuild only the active tab after the debounce.
  useEffect(() => {
    const req = requestedRef.current
    if (req && req.format === activeRef.current && req.content === content) return
    debouncerRef.current.schedule(() => {
      void load(activeRef.current, contentRef.current)
    })
  }, [content, load])

  useEffect(() => {
    const debouncer = debouncerRef.current
    const cache = cacheRef.current
    return () => {
      mountedRef.current = false
      debouncer.cancel()
      revokeUrl()
      cache.clear()
    }
  }, [revokeUrl])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !otherModalRef.current &&
        !e.defaultPrevented &&
        !(e.target as Element | null)?.closest?.('.cm-panels')
      ) {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const activeLabel = PREVIEW_FORMATS.find((f) => f.id === active)?.label ?? ''
  const current = shown && shown.format === active ? shown.value : null

  const renderBody = () => {
    if (error) {
      return (
        <div role="alert" style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          {error}
        </div>
      )
    }
    if (current === null) return null
    switch (active) {
      case 'pdf':
        return <iframe title="PDF preview" src={current} style={frameStyle} />
      case 'docx':
        return (
          <>
            <div
              style={{
                padding: '6px 12px',
                fontSize: 12,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {WORD_NOTE}
            </div>
            <iframe
              title="Word Document preview"
              sandbox=""
              srcDoc={current}
              style={frameStyle}
            />
          </>
        )
      case 'html-styled':
        return (
          <iframe
            title="Web Page (Styled) preview"
            sandbox=""
            srcDoc={current}
            style={frameStyle}
          />
        )
      case 'html-clean':
        return (
          <iframe
            title="Web Page (Clean) preview"
            sandbox=""
            srcDoc={current}
            style={frameStyle}
          />
        )
      case 'text':
        return (
          <pre
            aria-label="Plain Text preview"
            style={{
              flex: 1,
              margin: 0,
              padding: 12,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Consolas, "Courier New", monospace',
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          >
            {current}
          </pre>
        )
    }
  }

  return (
    <aside
      role="complementary"
      aria-label="Preview & Export"
      style={{
        width: 480,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Preview &amp; Export</span>
        {building && (
          <Loader2
            role="status"
            aria-label="Generating preview"
            size={14}
            className="animate-spin"
            color="var(--accent)"
          />
        )}
        <button
          type="button"
          aria-label="Close preview panel"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        role="tablist"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          padding: '6px 8px 0',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {PREVIEW_FORMATS.map((f) => {
          const selected = f.id === active
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(f.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${selected ? 'var(--accent)' : 'transparent'}`,
                color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12,
                padding: '4px 8px',
                cursor: 'pointer',
                fontWeight: selected ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {renderBody()}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 12,
            padding: '4px 12px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onExport(active)}
          style={{
            background: 'var(--accent)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 12px',
            cursor: 'pointer',
          }}
        >
          Export {activeLabel}
        </button>
      </div>
    </aside>
  )
}
